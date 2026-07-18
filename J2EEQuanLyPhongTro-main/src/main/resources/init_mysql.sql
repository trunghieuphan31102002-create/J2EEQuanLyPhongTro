-- =============================================
-- RentalMS - MySQL Database Initialization
-- =============================================
-- Buoc 1: Tao database (chay bang MySQL client truoc khi start app)
--   CREATE DATABASE IF NOT EXISTS rentalms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   USE rentalms;
--
-- Buoc 2: Chay file nay HOAC de Hibernate tu tao bang (ddl-auto=update)
--          roi import data tu rentalms_dump.sql
--
-- Luu y: Hibernate se tu tao cac bang khi app khoi dong.
--         File nay chi chua du lieu mau (sample data) de test.
--         Neu ban da co data trong DB, KHONG can chay file nay.
-- =============================================

-- ===== USERS (du lieu mau) =====
-- Password: 123456 (da hash bcrypt)
INSERT INTO `users` (`id`, `active`, `created_at`, `email`, `full_name`, `password_hash`, `phone`, `role`, `avatar_url`, `bank_account`, `bank_name`, `cccd_back_url`, `cccd_front_url`, `cccd_number`, `zalo_link`)
VALUES
  (1, 1, NOW(), 'admin@rentalms.com', 'Admin He Thong', '$2a$12$h0/6VNLtJ3N4A1eGqQhdWuaQSfwE88JEXE9EVh9u/MF2HF158839.', NULL, 'ADMIN', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (2, 1, NOW(), 'owner@rentalms.com', 'Nguyen Van A (Chu tro)', '$2a$12$cDYbVzANcxr2.bGi15HrSe6hHTExKUJZzj6q/dW0SoP4wj.w.dkSO', '0931847321', 'OWNER', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (3, 1, NOW(), 'manager@rentalms.com', 'Tran Thi B (Quan ly)', '$2a$12$LsE9L9w5Z9yg2aE.C.3U1.b6V2Wa4AZJWqAMm.2RIoDTGEb5zFgGm', '0902345678', 'MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (4, 1, NOW(), 'tenant1@rentalms.com', 'Le Van C (Nguoi thue 1)', '$2a$12$DtVZwE0c5A.M48I8EcUwzeyiHlSEaNLTnrQkorvp0oU5MwUicBofS', '0903456789', 'TENANT', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (5, 1, NOW(), 'tenant2@rentalms.com', 'Pham Thi D (Nguoi thue 2)', '$2a$12$EDizusnZGr9Ug4tzA26Z5O9NZ1u42flL9/KNuc88fzaFu5ndxy.a6', '0904567890', 'TENANT', NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- ===== BUILDINGS (du lieu mau) =====
INSERT INTO `buildings` (`id`, `address`, `created_at`, `description`, `name`, `publish_status`, `shape_geo_json`, `owner_id`, `assigned_manager_id`)
VALUES
  (1, '123 Duong Binh Loi, Binh Thanh, TP.HCM', NOW(), 'Khu tro 3 tang, gan truong dai hoc, day du tien nghi', 'Khu Tro Binh Thanh A', 'PUBLIC', NULL, 2, NULL),
  (2, '456 Duong Linh Trung, Thu Duc, TP.HCM', NOW(), 'Khu tro moi xay, gan cac khu cong nghiep', 'Khu Tro Thu Duc B', 'PRIVATE', NULL, 2, NULL)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- ===== ROOMS (du lieu mau) =====
INSERT INTO `rooms` (`id`, `amenities`, `area`, `beds`, `created_at`, `description`, `image_url`, `price`, `room_no`, `status`, `building_id`, `video_url`)
VALUES
  (1, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 20, 1, NOW(), 'Phong loai A - Tang 1', NULL, 2500000.00, '101', 'AVAILABLE', 1, NULL),
  (2, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 20, 1, NOW(), 'Phong loai A - Tang 1', NULL, 2500000.00, '102', 'AVAILABLE', 1, NULL),
  (3, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 20, 1, NOW(), 'Phong loai A - Tang 1', NULL, 2500000.00, '103', 'AVAILABLE', 1, NULL),
  (4, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 20, 1, NOW(), 'Phong loai A - Tang 1', NULL, 2500000.00, '104', 'AVAILABLE', 1, NULL),
  (5, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 25, 1, NOW(), 'Phong loai B - Tang 2', NULL, 3000000.00, '201', 'AVAILABLE', 1, NULL),
  (6, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 25, 1, NOW(), 'Phong loai B - Tang 2', NULL, 3000000.00, '202', 'AVAILABLE', 1, NULL),
  (7, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 25, 1, NOW(), 'Phong loai B - Tang 2', NULL, 3000000.00, '203', 'AVAILABLE', 1, NULL),
  (8, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 25, 1, NOW(), 'Phong loai B - Tang 2', NULL, 3000000.00, '204', 'AVAILABLE', 1, NULL),
  (9, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 30, 1, NOW(), 'Phong loai C - Tang 3', NULL, 3500000.00, '301', 'AVAILABLE', 1, NULL),
  (10, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 30, 1, NOW(), 'Phong loai C - Tang 3', NULL, 3500000.00, '302', 'AVAILABLE', 1, NULL),
  (11, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 30, 1, NOW(), 'Phong loai C - Tang 3', NULL, 3500000.00, '303', 'AVAILABLE', 1, NULL),
  (12, 'Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong', 30, 1, NOW(), 'Phong loai C - Tang 3', NULL, 3500000.00, '304', 'AVAILABLE', 1, NULL),
  (13, 'Wifi, May nuoc nong', 22, 1, NOW(), NULL, NULL, 2800000.00, 'P101', 'AVAILABLE', 2, NULL),
  (14, 'Wifi, May nuoc nong', 22, 1, NOW(), NULL, NULL, 2800000.00, 'P102', 'AVAILABLE', 2, NULL),
  (15, 'Wifi, May nuoc nong', 22, 1, NOW(), NULL, NULL, 2800000.00, 'P103', 'AVAILABLE', 2, NULL),
  (16, 'Wifi, May nuoc nong', 22, 1, NOW(), NULL, NULL, 2800000.00, 'P104', 'AVAILABLE', 2, NULL)
ON DUPLICATE KEY UPDATE `id` = `id`;
