/**
 * User-Agent enviado a las APIs públicas de ajedrez.
 *
 * Chess.com pide un agente reconocible con información de contacto: si alguna
 * vez tienen que bloquear una app, intentan avisar al contacto antes de
 * hacerlo (https://www.chess.com/news/view/published-data-api). Lichess no lo
 * exige, pero identificarse es buena educación con un servidor sin fines de
 * lucro.
 *
 * El contacto NO se hardcodea: sale de la variable de entorno `APP_CONTACT`
 * (un correo o la URL del repo), para no publicar datos personales en el
 * código fuente. Sin ella el agente sigue identificando la app, pero Chess.com
 * no tendría a quién escribir antes de bloquearla.
 */
const APP_NAME = "Zephyriov";

export function userAgent(): string {
  const contact = process.env.APP_CONTACT?.trim();
  return contact ? `${APP_NAME} (+${contact})` : APP_NAME;
}
