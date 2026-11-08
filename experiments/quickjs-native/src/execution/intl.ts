// LLRT provides DateTimeFormat, but the filesystem also needs NumberFormat.
// Load the standard FormatJS implementations before evaluating the Host graph.
import '@formatjs/intl-getcanonicallocales/polyfill.js'
import '@formatjs/intl-locale/polyfill.js'
import '@formatjs/intl-pluralrules/polyfill.js'
import '@formatjs/intl-pluralrules/locale-data/en.js'
import '@formatjs/intl-numberformat/polyfill.js'
import '@formatjs/intl-numberformat/locale-data/en.js'
