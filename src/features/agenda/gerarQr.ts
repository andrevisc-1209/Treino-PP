/** Imagem PNG (data URL) do QR code de um link. Carrega a biblioteca só quando alguém pede o QR. */
export async function gerarQrDoLink(link: string): Promise<string> {
  const { default: QRCode } = await import('qrcode')
  // margem de 2 módulos e correção "M": lê bem impresso ou na tela, mesmo com reflexo
  return QRCode.toDataURL(link, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
}
