const CHARACTER_PHOTO_MAX_SIZE = 512;
const CHARACTER_PHOTO_QUALITY = 0.72;

function loadWebImage(uri) {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Nao foi possivel abrir a imagem selecionada.'));
    image.src = uri;
  });
}

export async function compressCharacterPhotoForWeb(uri) {
  if (!uri || typeof document === 'undefined') {
    throw new Error('Imagem indisponivel para compressao.');
  }

  const image = await loadWebImage(uri);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error('A imagem selecionada nao possui dimensoes validas.');
  }

  const sourceSize = Math.min(width, height);
  const sourceX = (width - sourceSize) / 2;
  const sourceY = (height - sourceSize) / 2;
  const outputSize = Math.min(CHARACTER_PHOTO_MAX_SIZE, sourceSize);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('O navegador nao oferece suporte a compressao de imagens.');
  }

  canvas.width = outputSize;
  canvas.height = outputSize;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    outputSize,
    outputSize,
  );

  const compressed = canvas.toDataURL('image/jpeg', CHARACTER_PHOTO_QUALITY);

  if (!compressed.startsWith('data:image/jpeg;base64,')) {
    throw new Error('Nao foi possivel comprimir a imagem selecionada.');
  }

  return compressed;
}
