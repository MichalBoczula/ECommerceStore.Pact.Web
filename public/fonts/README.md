# Pact workspace fonts

The Pact workspace reuses the storefront's Roboto typography and Material Icons from this origin. Browser rendering and acceptance checks do not require Google Fonts requests.

- Roboto: [Google Fonts source](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/roboto/Roboto%5Bwdth%2Cwght%5D.ttf), commit `6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec`. SIL Open Font License 1.1, included in `ROBOTO-LICENSE.txt`.
- Material Icons: [Google source](https://github.com/google/material-design-icons/blob/10ecc14790612ca8fd164e3f4ffe9c16fc50d5b7/font/MaterialIcons-Regular.ttf), commit `10ecc14790612ca8fd164e3f4ffe9c16fc50d5b7`. Apache License 2.0, included in `MATERIAL-ICONS-LICENSE.txt`.

The complete source fonts were compressed from TTF to WOFF2 with FontTools. Roboto retains its full variable weight/width axes and extended Latin glyphs, including Polish characters. Material Icons retains its complete ligature set. No glyph subsetting or outline changes were applied. The source font licenses/copyrights remain with the assets.

| Asset | Source TTF SHA-256 | Vendored WOFF2 SHA-256 |
| --- | --- | --- |
| roboto-variable.woff2 | `d7598e12c5dbef095ff8272cfc55da0250bd07fbdecbac8a530b9b277872a134` | `9ad389bfef7fd0e7f5b69cc5c2d488d5f3b334b0b3eda5807da826035c0c059a` |
| material-icons.woff2 | `ef149f08bdd2ff09a4e2c8573476b7b0f3fbb15b623954ade59899e7175bedda` | `85b7375d3fada9640cdd040d1301db67b4df0661984a6576e362d21ee53579c8` |
