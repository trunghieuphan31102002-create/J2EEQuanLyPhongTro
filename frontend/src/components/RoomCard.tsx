import type { RoomListing } from '@/types/marketplace';
import { fmtNumber } from '@/lib/format';

const EMOJIS = ['🏠', '🏡', '🏢', '🏬', '🏗️', '🛋️'];
const randEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

interface Props {
  room: RoomListing;
  onClick?: (room: RoomListing) => void;
  ctaLabel?: string;
}

export default function RoomCard({ room, onClick, ctaLabel = 'Xem chi tiết' }: Props) {
  const available = room.status === 'AVAILABLE';
  return (
    <div
      onClick={() => onClick?.(room)}
      className="bg-brand-100 rounded-2xl overflow-hidden border-[1.5px] border-line cursor-pointer transition hover:-translate-y-1.5 hover:shadow-card-lg hover:border-brand-300"
    >
      <div className="relative h-[200px] flex items-center justify-center text-6xl bg-gradient-to-br from-brand-200 to-brand-400">
        {room.imageUrl ? (
          <img src={room.imageUrl} alt={room.roomNo ?? 'room'} className="w-full h-full object-cover" />
        ) : (
          <span>{randEmoji()}</span>
        )}
        <span
          className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white ${
            available ? 'bg-emerald-600' : 'bg-gray-500'
          }`}
        >
          {available ? 'Còn phòng' : 'Đã thuê'}
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-base font-bold mb-1">
          {room.roomNo ? `Phòng ${room.roomNo}` : 'Phòng trọ'}
        </h3>
        <div className="flex items-center gap-1 text-[13px] text-brand-600 mb-3">
          <i className="fa-solid fa-location-dot" />
          {room.buildingName || room.buildingAddress || 'Hồ Chí Minh'}
        </div>
        <div className="flex gap-4 mb-3.5 text-[13px] text-brand-600">
          {room.area != null && (
            <span className="flex items-center gap-1"><i className="fa-solid fa-expand" /> {room.area}m²</span>
          )}
          {room.beds != null && (
            <span className="flex items-center gap-1"><i className="fa-solid fa-bed" /> {room.beds} giường</span>
          )}
        </div>
        {room.amenities && (
          <p className="text-xs text-brand-600 mb-2 line-clamp-2">{room.amenities}</p>
        )}
        <div className="flex items-center justify-between pt-3.5 border-t border-line">
          <div className="text-xl font-extrabold text-brand-400">
            {fmtNumber(room.price)}
            <span className="text-xs font-medium text-brand-600">đ/tháng</span>
          </div>
          <button
            type="button"
            className="px-4 py-1.5 rounded-lg bg-brand-400 hover:bg-brand-500 text-white text-[13px] font-bold"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
