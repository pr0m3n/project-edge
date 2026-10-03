/**
 * Az árazó (`PriceEstimator`) nézetváltása kívülről — a chat AI-asszisztensének
 * gombjai használják. Külön fájlban, hogy a mindenhol betöltődő chat ne húzza
 * be magával az egész árazót.
 */
export const PRICING_MODEL_EVENT = "projectedge:pricing-model";
/** Ha a kérés másik oldalról jön, itt vár, amíg az árazó felépül. */
export const PRICING_MODEL_REQUEST_KEY = "projectedge-pricing-model";
