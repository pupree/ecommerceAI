export const getUploadedFile = (req) => {
  if (!req?.files) return null;

  const avatar = req.files.avatar;
  const file = req.files.file;

  if (avatar && avatar.tempFilePath) return avatar;
  if (file && file.tempFilePath) return file;

  return null;
};
