import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import './BuildingMap.css';

// Fix Leaflet default icon (Vite không bundle asset URL mặc định)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface BuildingMapProps {
  shapeGeoJson?: string | null;
  address?: string | null;
  buildingName?: string | null;
  height?: number;
}

interface ParsedGeo {
  center: [number, number];
  latLngs: L.LatLngTuple[];
}

function parseGeoJson(geoJsonStr: string): ParsedGeo | null {
  try {
    const geo = JSON.parse(geoJsonStr);
    if (geo.type !== 'Polygon' || !Array.isArray(geo.coordinates) || !geo.coordinates[0]) return null;
    const ring = geo.coordinates[0] as Array<[number, number]>;
    if (ring.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;
    const latLngs: L.LatLngTuple[] = [];
    for (const [lng, lat] of ring) {
      sumLat += lat;
      sumLng += lng;
      latLngs.push([lat, lng]);
    }
    return {
      center: [sumLat / ring.length, sumLng / ring.length],
      latLngs,
    };
  } catch {
    return null;
  }
}

export default function BuildingMap({
  shapeGeoJson,
  address,
  buildingName,
  height = 260,
}: BuildingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routingRef = useRef<L.Routing.Control | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);

  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoInfo, setGeoInfo] = useState<string | null>(null); // thong bao (VD: "vi tri theo IP")
  const [routeInfo, setRouteInfo] = useState<{ km: number; mins: number } | null>(null);
  const [pickMode, setPickMode] = useState(false);

  const parsed = useMemo(() => (shapeGeoJson ? parseGeoJson(shapeGeoJson) : null), [shapeGeoJson]);

  // === Init map ===
  useEffect(() => {
    if (!containerRef.current) return;

    const defaultCenter: [number, number] = [10.776, 106.700]; // TP.HCM
    const center = parsed?.center ?? defaultCenter;

    const map = L.map(containerRef.current, {
      center,
      zoom: parsed ? 17 : 12,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Polygon
    if (parsed && shapeGeoJson) {
      try {
        const geo = JSON.parse(shapeGeoJson);
        const layer = L.geoJSON(geo, {
          style: {
            color: '#16A34A',
            weight: 2,
            fillColor: '#22C55E',
            fillOpacity: 0.25,
          },
        }).addTo(map);
        const b = layer.getBounds();
        if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
      } catch { /* ignore */ }
    }

    // Marker dich
    const marker = L.marker(center).addTo(map);
    if (buildingName || address) {
      marker.bindPopup(
        `<div style="min-width:160px"><b>${buildingName ?? ''}</b>${address ? `<br/><small>${address}</small>` : ''}</div>`,
      );
    }
    destMarkerRef.current = marker;

    const timer = setTimeout(() => map.invalidateSize(), 100);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      routingRef.current = null;
      destMarkerRef.current = null;
    };
  }, [parsed, shapeGeoJson, address, buildingName]);

  // === Routing khi co userLoc ===
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLoc || !parsed) return;

    // Xoa route cu neu co
    if (routingRef.current) {
      map.removeControl(routingRef.current);
      routingRef.current = null;
    }

    // Cast to any vi @types/leaflet-routing-machine thieu 1 so option (createMarker, etc.)
    const control = L.Routing.control({
      waypoints: [L.latLng(userLoc[0], userLoc[1]), L.latLng(parsed.center[0], parsed.center[1])],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving',
      }),
      lineOptions: {
        styles: [
          { color: '#F97316', weight: 5, opacity: 0.9 }, // cam - theme chinh
          { color: '#ffffff', weight: 2, opacity: 0.6 }, // vien trang
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
      show: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      routeWhileDragging: false,
      createMarker: (i: number, wp: L.Routing.Waypoint) => {
        if (i === 0) {
          return L.marker(wp.latLng, {
            icon: L.divIcon({
              className: 'rms-user-marker',
              html: '<div class="rms-user-dot"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          });
        }
        return L.marker(wp.latLng);
      },
    } as L.Routing.RoutingControlOptions);

    control.on('routesfound', (e: L.Routing.RoutingResultEvent) => {
      const r = e.routes?.[0];
      if (r && r.summary) {
        setRouteInfo({
          km: +(r.summary.totalDistance / 1000).toFixed(1),
          mins: Math.round(r.summary.totalTime / 60),
        });
      }
    });

    control.on('routingerror', () => {
      setGeoError('Không tìm được tuyến đường');
    });

    control.addTo(map);
    routingRef.current = control;
  }, [userLoc, parsed]);

  // Fallback: lay vi tri theo IP - uu tien qua backend proxy (tranh ad-blocker)
  const locateByIp = async (): Promise<[number, number] | null> => {
    // 1. Goi backend proxy (cung origin, khong bi ad-blocker chan)
    try {
      const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
      const res = await fetch(`${apiBase}/geolocate/me`);
      if (res.ok) {
        const body = await res.json();
        const data = body?.data;
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return [data.latitude, data.longitude];
        }
      }
    } catch { /* ignore */ }
    // 2. Fallback: ipwho.is client-side (co the bi ad-blocker chan)
    try {
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return [data.latitude, data.longitude];
      }
    } catch { /* ignore */ }
    // 3. Fallback cuoi: ipapi.co client-side
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return [data.latitude, data.longitude];
      }
    } catch { /* ignore */ }
    return null;
  };

  const handleLocate = () => {
    setGeoLoading(true);
    setGeoError(null);
    setGeoInfo(null);

    const fallbackToIp = async (reason: string) => {
      const ipLoc = await locateByIp();
      if (ipLoc) {
        setUserLoc(ipLoc);
        setGeoInfo(`${reason} Đã dùng vị trí ước lượng theo IP (cấp thành phố).`);
      } else {
        setGeoError(`${reason} Fallback theo IP cũng thất bại — hãy dùng "Chọn trên bản đồ".`);
      }
      setGeoLoading(false);
    };

    if (!navigator.geolocation) {
      fallbackToIp('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc([pos.coords.latitude, pos.coords.longitude]);
        setGeoInfo('Đã xác định vị trí chính xác của bạn.');
        setGeoLoading(false);
      },
      (err) => {
        // Bat ky loi nao -> fallback sang IP geolocation
        let reason: string;
        if (err.code === err.PERMISSION_DENIED) {
          reason = 'Bạn chưa cho phép chia sẻ vị trí.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reason = 'Thiết bị không xác định được vị trí GPS/Wi-Fi.';
        } else if (err.code === err.TIMEOUT) {
          reason = 'Hết thời gian định vị GPS.';
        } else {
          reason = 'Định vị GPS thất bại.';
        }
        fallbackToIp(reason);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  };

  const handlePickMode = () => {
    const map = mapRef.current;
    if (!map) return;
    setPickMode(true);
    setGeoError(null);
    map.getContainer().style.cursor = 'crosshair';

    const onClick = (e: L.LeafletMouseEvent) => {
      setUserLoc([e.latlng.lat, e.latlng.lng]);
      setPickMode(false);
      map.getContainer().style.cursor = '';
      map.off('click', onClick);
    };
    map.on('click', onClick);
  };

  const clearRoute = () => {
    if (mapRef.current && routingRef.current) {
      mapRef.current.removeControl(routingRef.current);
      routingRef.current = null;
    }
    if (mapRef.current) {
      mapRef.current.getContainer().style.cursor = '';
    }
    setUserLoc(null);
    setRouteInfo(null);
    setGeoError(null);
    setGeoInfo(null);
    setPickMode(false);
  };

  return (
    <div className="rms-map-wrap">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}
      />
      <div className="rms-map-actions">
        {!userLoc ? (
          <>
            <button
              type="button"
              className="rms-map-btn rms-map-btn-primary"
              onClick={handleLocate}
              disabled={geoLoading || !parsed || pickMode}
            >
              <i className={`fa-solid ${geoLoading ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`} />
              {geoLoading ? 'Đang định vị...' : 'Vị trí của tôi'}
            </button>
            <button
              type="button"
              className="rms-map-btn rms-map-btn-outline"
              onClick={handlePickMode}
              disabled={!parsed || pickMode}
            >
              <i className="fa-solid fa-hand-pointer" />
              {pickMode ? 'Click lên bản đồ...' : 'Chọn trên bản đồ'}
            </button>
          </>
        ) : (
          <>
            {routeInfo && (
              <div className="rms-route-info">
                <span><i className="fa-solid fa-road" /> {routeInfo.km} km</span>
                <span><i className="fa-solid fa-clock" /> {routeInfo.mins} phút</span>
              </div>
            )}
            <button type="button" className="rms-map-btn rms-map-btn-outline" onClick={clearRoute}>
              <i className="fa-solid fa-xmark" /> Xóa tuyến
            </button>
          </>
        )}
      </div>
      {pickMode && (
        <div className="rms-map-hint" style={{ background: '#FFF7ED', color: '#C2410C' }}>
          <i className="fa-solid fa-hand-pointer" /> Click vào bản đồ để chọn vị trí xuất phát của bạn
        </div>
      )}
      {geoInfo && !geoError && (
        <div className="rms-map-hint" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
          <i className="fa-solid fa-circle-info" /> {geoInfo}
        </div>
      )}
      {geoError && <div className="rms-map-error"><i className="fa-solid fa-triangle-exclamation" /> {geoError}</div>}
      {!parsed && (
        <div className="rms-map-hint">
          <i className="fa-solid fa-circle-info" /> Tòa nhà này chưa có tọa độ bản đồ.
        </div>
      )}
    </div>
  );
}
