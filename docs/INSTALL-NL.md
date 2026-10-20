# Installatie in Jellyfin

## Rechtstreeks plakken — geen hosting nodig

1. Installeer [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) en volg de herstartinstructies van die plugin.
2. Ga naar **Dashboard → JS Injector**.
3. Schakel het oude ratings-script of de oude loader uit.
4. Voeg één script toe: **Miru Episode Ratings**.
5. Open `Jellyfin-Miru-Episode-Ratings.js` in deze repository en klik op **Raw**. Kopieer de volledige inhoud naar het JavaScript-codeveld. Kopieer geen Markdown-codeblokken of HTML-script-tags mee.
6. Zet **Enabled** aan en sla op. Laat een eventueel Script URL-veld leeg; dit bestand is geen module.
7. Herlaad Jellyfin met **Ctrl+F5** en open een serie met seizoenen.
8. Klap **IMDb Episodes Grid** open. De knop linksboven in de tabel wisselt de horizontale en verticale assen.

Er is bewust geen keuze tussen Grid, Wrapped en List meer. Dit project bevat alleen de tabel.

## Bijwerken en verwijderen

Bijwerken: vervang de volledige code door de nieuwste versie, sla op en herlaad de pagina volledig. Een geplakt bestand werkt zichzelf niet automatisch bij.

Verwijderen: schakel de scriptregel uit of verwijder hem en herlaad Jellyfin. De opgeslagen asvoorkeur en tijdelijke browsercache kunnen achterblijven; zie de probleemoplossing.

## Geen blok zichtbaar?

Zet tijdelijk `DEBUG: true` bovenaan het script, sla op en herlaad. De melding rechtsonder geeft aan of de seriepagina en de seizoenen gevonden zijn. Zet DEBUG weer uit zodra het werkt.

Een fout met **Url name cannot be empty** hoorde bij een vroege ontwikkelversie. De huidige cache-identificatie roept geen URL-functie aan. Controleer of een oud script nog ingeschakeld is en vervang de volledige inhoud.

Zie [Troubleshooting](TROUBLESHOOTING.md) voor meer controles. Vermeld bij een melding de Jellyfin-, plugin- en browserversie en de exacte fouttekst. Deel geen tokens of persoonlijke bibliotheekgegevens.
