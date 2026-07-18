import { useEffect, useState, useRef, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  assignBuildingManager,
  createBuilding,
  deleteBuilding,
  listAvailableManagers,
  listMyBuildings,
  updateBuildingDetails,
} from '@/api/buildings';
import { uploadImage } from '@/api/upload';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import type { Building, BuildingCreate, ManagerOption } from '@/types/building';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ------------------------------------------------------------------ */
/*  Inline Map Picker Component (search + click + manual lat/lng)     */
/* ------------------------------------------------------------------ */
function MapPicker({
  lat, lng, polygon,
  onLatLngChange, onPolygonChange,
}: {
  lat: number | undefined; lng: number | undefined; polygon: string | undefined;
  onLatLngChange: (lat: number, lng: number) => void;
  onPolygonChange: (geoJson: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const drawPointsRef = useRef<L.LatLng[]>([]);
  const drawMarkersRef = useRef<L.Marker[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [manualLat, setManualLat] = useState(lat?.toString() ?? '');
  const [manualLng, setManualLng] = useState(lng?.toString() ?? '');

  // Init map — poll until container has real dimensions
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    let cancelled = false;

    const tryInit = () => {
      if (cancelled || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      if (rect.width < 50) {
        // Container not visible yet, retry
        requestAnimationFrame(tryInit);
        return;
      }
      const map = L.map(mapRef.current, { zoomControl: true }).setView(
        [lat ?? 10.7769, lng ?? 106.7009], 14
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM',
      }).addTo(map);
      mapInstance.current = map;

      // Keep size in sync
      const observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(mapRef.current!);
      cleanupRef.current = () => observer.disconnect();

      // Set initial marker
      if (lat && lng) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current!.getLatLng();
          onLatLngChange(pos.lat, pos.lng);
          setManualLat(pos.lat.toFixed(6));
          setManualLng(pos.lng.toFixed(6));
        });
      }

      // Load existing polygon
      if (polygon) {
        try {
          const geo = JSON.parse(polygon);
          const coords = geo.coordinates?.[0]?.map((c: number[]) => [c[1], c[0]]) ?? [];
          if (coords.length > 2) {
            polygonLayerRef.current = L.polygon(coords, { color: '#E8622A', weight: 2, fillOpacity: 0.2 }).addTo(map);
            map.fitBounds(polygonLayerRef.current.getBounds());
          }
        } catch { /* ignore bad json */ }
      }

      // Click to place marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        if ((map as unknown as { _isDrawingPolygon?: boolean })._isDrawingPolygon) return;
        const { lat: clat, lng: clng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = L.marker(e.latlng, { draggable: true }).addTo(map);
          markerRef.current.on('dragend', () => {
            const pos = markerRef.current!.getLatLng();
            onLatLngChange(pos.lat, pos.lng);
            setManualLat(pos.lat.toFixed(6));
            setManualLng(pos.lng.toFixed(6));
          });
        }
        onLatLngChange(clat, clng);
        setManualLat(clat.toFixed(6));
        setManualLng(clng.toFixed(6));
      });
    };

    requestAnimationFrame(tryInit);

    return () => { cancelled = true; cleanupRef.current?.(); if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search location via Nominatim — show results dropdown
  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const query = search.match(/vietnam|việt nam|vn|hcm|hà nội|đà nẵng/i) ? search : `${search}, Vietnam`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn&accept-language=vi`);
      const data = await res.json();
      if (data.length > 0) {
        setSearchResults(data);
      } else {
        // Fallback: try street name only
        const parts = search.split(/[,\s]+/).filter(p => p.length > 2);
        if (parts.length > 1) {
          const fallback = parts.slice(-2).join(' ') + ', Ho Chi Minh City, Vietnam';
          const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallback)}&limit=5&countrycodes=vn&accept-language=vi`);
          const data2 = await res2.json();
          if (data2.length > 0) {
            setSearchResults(data2);
          } else {
            alert('Không tìm thấy. Hãy click trực tiếp trên bản đồ hoặc nhập tọa độ.');
          }
        } else {
          alert('Không tìm thấy. Hãy click trực tiếp trên bản đồ hoặc nhập tọa độ.');
        }
      }
    } catch {
      alert('Lỗi tìm kiếm.');
    } finally {
      setSearching(false);
    }
  };

  // Select a search result
  const selectResult = (r: { lat: string; lon: string; display_name: string }) => {
    const nlat = parseFloat(r.lat), nlng = parseFloat(r.lon);
    mapInstance.current?.setView([nlat, nlng], 17);
    if (markerRef.current) {
      markerRef.current.setLatLng([nlat, nlng]);
    } else if (mapInstance.current) {
      markerRef.current = L.marker([nlat, nlng], { draggable: true }).addTo(mapInstance.current);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng();
        onLatLngChange(pos.lat, pos.lng);
        setManualLat(pos.lat.toFixed(6));
        setManualLng(pos.lng.toFixed(6));
      });
    }
    onLatLngChange(nlat, nlng);
    setManualLat(nlat.toFixed(6));
    setManualLng(nlng.toFixed(6));
    setSearchResults([]);
  };

  // Manual lat/lng input
  const applyManual = () => {
    const nlat = parseFloat(manualLat), nlng = parseFloat(manualLng);
    if (isNaN(nlat) || isNaN(nlng)) return;
    mapInstance.current?.setView([nlat, nlng], 16);
    if (markerRef.current) {
      markerRef.current.setLatLng([nlat, nlng]);
    } else if (mapInstance.current) {
      markerRef.current = L.marker([nlat, nlng], { draggable: true }).addTo(mapInstance.current);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng();
        onLatLngChange(pos.lat, pos.lng);
        setManualLat(pos.lat.toFixed(6));
        setManualLng(pos.lng.toFixed(6));
      });
    }
    onLatLngChange(nlat, nlng);
  };

  // Polygon drawing mode
  const startDraw = useCallback(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    (map as unknown as { _isDrawingPolygon: boolean })._isDrawingPolygon = true;
    setIsDrawing(true);
    // Clear old polygon
    if (polygonLayerRef.current) { map.removeLayer(polygonLayerRef.current); polygonLayerRef.current = null; }
    drawPointsRef.current = [];
    drawMarkersRef.current.forEach(m => map.removeLayer(m));
    drawMarkersRef.current = [];

    const onClick = (e: L.LeafletMouseEvent) => {
      drawPointsRef.current.push(e.latlng);
      const smallIcon = L.divIcon({ className: '', html: '<div style="width:10px;height:10px;background:#E8622A;border:2px solid #fff;border-radius:50%"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });
      const m = L.marker(e.latlng, { icon: smallIcon }).addTo(map);
      drawMarkersRef.current.push(m);
      // Draw temp polygon
      if (polygonLayerRef.current) map.removeLayer(polygonLayerRef.current);
      if (drawPointsRef.current.length >= 3) {
        polygonLayerRef.current = L.polygon(drawPointsRef.current, { color: '#E8622A', weight: 2, fillOpacity: 0.2 }).addTo(map);
      }
    };
    map.on('click', onClick);
    (map as unknown as { _drawClickHandler: (e: L.LeafletMouseEvent) => void })._drawClickHandler = onClick;
  }, []);

  const finishDraw = useCallback(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    (map as unknown as { _isDrawingPolygon: boolean })._isDrawingPolygon = false;
    setIsDrawing(false);
    const handler = (map as unknown as { _drawClickHandler?: (e: L.LeafletMouseEvent) => void })._drawClickHandler;
    if (handler) map.off('click', handler);
    // Clean up draw markers
    drawMarkersRef.current.forEach(m => map.removeLayer(m));
    drawMarkersRef.current = [];

    if (drawPointsRef.current.length >= 3) {
      const coords = drawPointsRef.current.map(p => [p.lng, p.lat]);
      coords.push(coords[0]); // close polygon
      const geoJson = JSON.stringify({ type: 'Polygon', coordinates: [coords] });
      onPolygonChange(geoJson);
    }
  }, [onPolygonChange]);

  const clearPolygon = useCallback(() => {
    if (!mapInstance.current) return;
    if (polygonLayerRef.current) { mapInstance.current.removeLayer(polygonLayerRef.current); polygonLayerRef.current = null; }
    drawMarkersRef.current.forEach(m => mapInstance.current!.removeLayer(m));
    drawMarkersRef.current = [];
    drawPointsRef.current = [];
    onPolygonChange('');
  }, [onPolygonChange]);

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm địa chỉ trên bản đồ..."
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
        />
        <button type="button" className="btn btn-sm btn-primary" onClick={handleSearch} disabled={searching}>
          <i className="fa-solid fa-search" /> {searching ? '...' : 'Tìm'}
        </button>
      </div>
      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, maxHeight: 150, overflowY: 'auto', background: 'var(--bg, #fff)' }}>
          {searchResults.map((r, i) => (
            <div
              key={i}
              onClick={() => selectResult(r)}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f0f0f0')}
              onMouseOut={(e) => (e.currentTarget.style.background = '')}
            >
              <i className="fa-solid fa-location-dot" style={{ color: '#E8622A', marginRight: 6 }} />
              {r.display_name}
            </div>
          ))}
        </div>
      )}
      {/* Map */}
      <div ref={mapRef} style={{ height: 300, width: '100%', borderRadius: 8, border: '1px solid var(--border)', position: 'relative', zIndex: 0 }} />
      {/* Manual lat/lng */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
        <input value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="Vĩ độ (lat)" style={{ flex: 1, fontSize: 12 }} />
        <input value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="Kinh độ (lng)" style={{ flex: 1, fontSize: 12 }} />
        <button type="button" className="btn btn-sm btn-outline" onClick={applyManual} title="Áp dụng tọa độ">
          <i className="fa-solid fa-crosshairs" />
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
        <i className="fa-solid fa-circle-info" /> Click trên bản đồ hoặc nhập tọa độ để chọn vị trí. Kéo marker để điều chỉnh.
      </p>
      {/* Polygon tools */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {!isDrawing ? (
          <button type="button" className="btn btn-sm btn-outline" onClick={startDraw}>
            <i className="fa-solid fa-draw-polygon" /> Vẽ ranh giới
          </button>
        ) : (
          <button type="button" className="btn btn-sm btn-primary" onClick={finishDraw}>
            <i className="fa-solid fa-check" /> Hoàn tất vẽ
          </button>
        )}
        <button type="button" className="btn btn-sm btn-outline" onClick={clearPolygon} style={{ color: '#ef4444' }}>
          <i className="fa-solid fa-trash" /> Xóa polygon
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main BuildingsSection                                              */
/* ------------------------------------------------------------------ */
export default function BuildingsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BuildingCreate>({ name: '', address: '', description: '', publishStatus: 'PRIVATE' });
  const [saving, setSaving] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  // Edit modal
  const [editModal, setEditModal] = useState<Building | null>(null);
  const [editImgFile, setEditImgFile] = useState<File | null>(null);
  const [editImgPreview, setEditImgPreview] = useState<string | null>(null);
  const [editLat, setEditLat] = useState<number | undefined>();
  const [editLng, setEditLng] = useState<number | undefined>();
  const [editPolygon, setEditPolygon] = useState<string | undefined>();
  const [editSaving, setEditSaving] = useState(false);

  // Assign manager state
  const [assignModal, setAssignModal] = useState<Building | null>(null);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [pickedManagerId, setPickedManagerId] = useState<number | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  const refresh = () => {
    setLoading(true);
    listMyBuildings()
      .then(setBuildings)
      .catch(() => toast.error('Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle image preview for create
  const handleImgChange = (file: File | null, isEdit = false) => {
    if (!file) return;
    if (isEdit) {
      setEditImgFile(file);
      setEditImgPreview(URL.createObjectURL(file));
    } else {
      setImgFile(file);
      setImgPreview(URL.createObjectURL(file));
    }
  };

  // CREATE building
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address) {
      toast.error('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (imgFile) imageUrl = await uploadImage(imgFile);
      await createBuilding({ ...form, imageUrl });
      toast.success('Tạo tòa nhà thành công!');
      setModalOpen(false);
      setForm({ name: '', address: '', description: '', publishStatus: 'PRIVATE' });
      setImgFile(null);
      setImgPreview(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Lỗi tạo tòa nhà'));
    } finally {
      setSaving(false);
    }
  };

  // OPEN edit modal
  const openEdit = (b: Building) => {
    setEditModal(b);
    setEditImgFile(null);
    setEditImgPreview(b.imageUrl ?? null);
    setEditLat(b.latitude ?? undefined);
    setEditLng(b.longitude ?? undefined);
    setEditPolygon(b.shapeGeoJson ?? undefined);
  };

  // SAVE edit
  const submitEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    try {
      let imageUrl = editModal.imageUrl;
      if (editImgFile) imageUrl = await uploadImage(editImgFile);
      const body: Record<string, unknown> = {};
      if (imageUrl !== editModal.imageUrl) body.imageUrl = imageUrl;
      if (editLat !== editModal.latitude) body.latitude = editLat;
      if (editLng !== editModal.longitude) body.longitude = editLng;
      if (editPolygon !== editModal.shapeGeoJson) body.shapeGeoJson = editPolygon || null;
      if (Object.keys(body).length === 0 && !editImgFile) {
        toast.show('Không có thay đổi');
        setEditModal(null);
        return;
      }
      if (editImgFile && !body.imageUrl) body.imageUrl = imageUrl;
      await updateBuildingDetails(editModal.id, body);
      toast.success('Cập nhật thành công!');
      setEditModal(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  };

  const openAssign = async (b: Building) => {
    setAssignModal(b);
    setPickedManagerId(b.assignedManager?.id ?? null);
    try {
      const list = await listAvailableManagers();
      setManagers(list);
    } catch {
      toast.error('Không tải được danh sách quản lý');
    }
  };

  const submitAssign = async () => {
    if (!assignModal) return;
    setAssignSaving(true);
    try {
      await assignBuildingManager(assignModal.id, pickedManagerId);
      toast.success(pickedManagerId ? 'Đã gán quản lý' : 'Đã bỏ quản lý');
      setAssignModal(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAssignSaving(false);
    }
  };

  const handleDeleteBuilding = async (b: Building) => {
    if (!confirm(`Bạn có chắc muốn xóa tòa nhà "${b.name}"?\nTất cả phòng trong tòa nhà (không có hợp đồng) cũng sẽ bị xóa.\nHành động này không thể hoàn tác.`)) return;
    setDeletingId(b.id);
    try {
      await deleteBuilding(b.id);
      toast.success(`Đã xóa tòa nhà "${b.name}"`);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="section-card">
        <div className="section-head">
          <h3>
            <i className="fa-solid fa-building" style={{ color: 'var(--primary)' }} />{' '}
            {isManager ? 'Tòa nhà được giao' : 'Tòa nhà của tôi'}
          </h3>
          {isOwner && (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <i className="fa-solid fa-plus" /> Thêm tòa nhà
            </button>
          )}
        </div>
        {loading ? (
          <div className="loading"><span className="spinner" /> Đang tải...</div>
        ) : buildings.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏗️</div>
            <p>
              {isManager
                ? 'Chưa được giao quản lý tòa nhà nào. Vui lòng liên hệ chủ trọ.'
                : 'Chưa có tòa nhà nào. Hãy thêm tòa nhà đầu tiên!'}
            </p>
            {isOwner && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalOpen(true)}>
                <i className="fa-solid fa-plus" /> Thêm ngay
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20, padding: 20 }}>
            {buildings.map((b) => (
              <div key={b.id} style={{ border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', transition: '.2s' }}>
                <div style={{ height: 140, background: b.imageUrl ? `url(${b.imageUrl}) center/cover` : 'linear-gradient(135deg,#F2C185,#D4845A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, position: 'relative' }}>
                  {!b.imageUrl && '🏢'}
                  {b.latitude && b.longitude && (
                    <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                      <i className="fa-solid fa-location-dot" /> {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
                    </span>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{b.name}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>
                    <i className="fa-solid fa-location-dot" /> {b.address || 'Chưa có địa chỉ'}
                  </p>
                  {b.assignedManager ? (
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 10 }}>
                      <i className="fa-solid fa-user-tie" style={{ color: '#3b82f6' }} />{' '}
                      Quản lý: <b>{b.assignedManager.fullName}</b>
                    </p>
                  ) : isOwner ? (
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 10, fontStyle: 'italic' }}>
                      <i className="fa-solid fa-user-slash" /> Chưa gán quản lý
                    </p>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`badge ${b.publishStatus === 'PUBLIC' ? 'badge-green' : 'badge-gray'}`}>
                      {b.publishStatus === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                    </span>
                    {b.shapeGeoJson && <span className="badge badge-blue"><i className="fa-solid fa-draw-polygon" /> Polygon</span>}
                    <button className="btn btn-sm btn-outline" onClick={() => navigate('/dashboard/rooms')}>
                      <i className="fa-solid fa-door-open" /> Xem phòng
                    </button>
                    {isOwner && (
                      <>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(b)}>
                          <i className="fa-solid fa-pen" /> Sửa
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => openAssign(b)}>
                          <i className="fa-solid fa-user-tie" /> {b.assignedManager ? 'Đổi QL' : 'Gán QL'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                          disabled={deletingId === b.id}
                          onClick={() => handleDeleteBuilding(b)}
                          title="Xóa tòa nhà"
                        >
                          <i className="fa-solid fa-trash" /> {deletingId === b.id ? '...' : 'Xóa'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <div className={`modal-overlay${modalOpen ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="modal" style={{ maxWidth: 600 }}>
          <div className="modal-head">
            <h3>Thêm tòa nhà</h3>
            <button className="modal-close" onClick={() => setModalOpen(false)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label>Tên tòa nhà *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Chung cư A" required />
              </div>
              <div className="form-group">
                <label>Địa chỉ *</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="VD: 123 Nguyễn Huệ, Q1, TP.HCM" required />
              </div>
              <div className="form-group">
                <label>Ảnh tòa nhà</label>
                {imgPreview && <img src={imgPreview} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                <input type="file" accept="image/*" onChange={(e) => handleImgChange(e.target.files?.[0] ?? null)} />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Trạng thái hiển thị</label>
                <select value={form.publishStatus} onChange={(e) => setForm({ ...form, publishStatus: e.target.value as 'PUBLIC' | 'PRIVATE' })}>
                  <option value="PRIVATE">Riêng tư</option>
                  <option value="PUBLIC">Công khai (marketplace)</option>
                </select>
              </div>
              <div className="form-group">
                <label><i className="fa-solid fa-map-location-dot" /> Vị trí & Ranh giới trên bản đồ</label>
                <MapPicker
                  lat={form.latitude} lng={form.longitude} polygon={form.shapeGeoJson}
                  onLatLngChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))}
                  onPolygonChange={(geo) => setForm(f => ({ ...f, shapeGeoJson: geo }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Tạo tòa nhà'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit modal (image, location, polygon) */}
      <div className={`modal-overlay${editModal ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setEditModal(null); }}>
        <div className="modal" style={{ maxWidth: 600 }}>
          <div className="modal-head">
            <h3>Chỉnh sửa — {editModal?.name}</h3>
            <button className="modal-close" onClick={() => setEditModal(null)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-group">
              <label>Ảnh tòa nhà</label>
              {editImgPreview && <img src={editImgPreview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
              <input type="file" accept="image/*" onChange={(e) => handleImgChange(e.target.files?.[0] ?? null, true)} />
            </div>
            <div className="form-group">
              <label><i className="fa-solid fa-map-location-dot" /> Vị trí & Ranh giới</label>
              {editModal && (
                <MapPicker
                  lat={editLat} lng={editLng} polygon={editPolygon}
                  onLatLngChange={(lat, lng) => { setEditLat(lat); setEditLng(lng); }}
                  onPolygonChange={(geo) => setEditPolygon(geo)}
                />
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setEditModal(null)}>Hủy</button>
            <button type="button" className="btn btn-primary" disabled={editSaving} onClick={submitEdit}>
              {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>

      {/* Assign manager modal */}
      <div className={`modal-overlay${assignModal ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setAssignModal(null); }}>
        <div className="modal">
          <div className="modal-head">
            <h3>Gán quản lý cho {assignModal?.name}</h3>
            <button className="modal-close" onClick={() => setAssignModal(null)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <div className="modal-body">
            {managers.length === 0 ? (
              <div className="empty" style={{ padding: 24 }}>
                <div className="empty-icon">👤</div>
                <p>Chưa có tài khoản quản lý nào trong hệ thống.</p>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Admin cần tạo tài khoản role MANAGER trước.
                </p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Chọn quản lý</label>
                  <select
                    value={pickedManagerId ?? ''}
                    onChange={(e) => setPickedManagerId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">-- Không gán (bỏ quản lý) --</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Quản lý sẽ được phép: nhập điện/nước, thêm khoản phí, xử lý bảo trì và xác nhận tiền mặt cho tòa nhà này.
                </p>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setAssignModal(null)}>Hủy</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={assignSaving || managers.length === 0}
              onClick={submitAssign}
            >
              {assignSaving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
