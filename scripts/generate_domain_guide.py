"""
ELAVULT — ne ezt használd.

Ezt a scriptet a `scripts/generate_guides.py` váltotta le, ami a weboldal és a
Resend levelek design nyelvén készíti el mind a négy ügyfél-útmutatót
(domain / Vercel / Supabase / Resend), és a közös design rendszert a
`scripts/guide_kit.py` tartalmazza.

    python3 scripts/generate_guides.py

Az itteni régi változat több hibát is tartalmazott, amiket az új generátor javít:
  * `registerFontFamily` hiányában a `<b>` kiemelések csendben eltűntek,
  * a képernyőképek vágás nélkül, lekicsinyítve kerültek a lapra,
  * a hivatkozások nem voltak kattinthatók,
  * a fix magasságú kártyák alján nagy üres sávok maradtak,
  * a paletta nem egyezett sem a weboldallal, sem a levelekkel.
"""

import sys

if __name__ == "__main__":
    sys.exit(
        "Ez a script elavult. Használd helyette: python3 scripts/generate_guides.py"
    )
