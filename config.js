/**
 * LOCAL ADMIN PASSWORD
 *
 * Change this value before sharing the project with anyone.
 * This local-only package does not use Manus, OAuth, a remote database, or cloud storage.
 * You may alternatively set LOCAL_ADMIN_PASSWORD in your Windows terminal before starting.
 */
module.exports = {
  // Default first-use access: username Admin, password 123.
  // Change this before sharing the local website folder.
  adminPassword: "123",

  // Maximum size for one local image or video upload in the Local Admin.
  // 1024 MB = 1 GB. Increase this only if your computer has enough free space.
  uploadLimitMb: 1024
};
