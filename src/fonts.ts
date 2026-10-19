// Bundled fonts (no Google Fonts request). Display: Anton · Body: Barlow Semi Condensed · Ransom-note faces: Abril Fatface, Alfa Slab One, Archivo Black, Special Elite.
// The per-weight files declare every subset with its unicode-range, so the browser only downloads
// latin-ext (Hungarian ő, ű…) when such a letter is actually on the page. The bare latin-ext.css files
// have no unicode-range, which made every visit download both subsets of every face.
import "@fontsource/anton/400.css";
import "@fontsource/barlow-semi-condensed/500.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow-semi-condensed/700.css";
import "@fontsource/barlow-semi-condensed/800.css";
import "@fontsource/abril-fatface/400.css";
import "@fontsource/alfa-slab-one/400.css";
import "@fontsource/archivo-black/400.css";
import "@fontsource/special-elite/400.css";
