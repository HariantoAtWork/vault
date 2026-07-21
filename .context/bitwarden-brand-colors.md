# Bitwarden Brand Colours

Source: [bitwarden.com/brand](https://bitwarden.com/brand/) and [github.com/bitwarden/brand](https://github.com/bitwarden/brand)

---

## Primary Colours

| Name            | HEX       | RGB              | HSL                    |
|-----------------|-----------|------------------|------------------------|
| Bitwarden Blue  | `#175DDC` | 23, 93, 220      | hsla(219, 81%, 48%, 1) |
| Deep Blue       | `#0C3276` | 12, 50, 118      | hsla(219, 81%, 25%, 1) |

## Neutral Colours

| Name        | HEX       | RGB              | HSL                     |
|-------------|-----------|------------------|-------------------------|
| Off White   | `#F3F6F9` | 243, 246, 249    | hsla(210, 33%, 96%, 1)  |
| True White  | `#FFFFFF` | 255, 255, 255    | hsla(0, 0%, 100%, 1)    |
| True Black  | `#000000` | 0, 0, 0          | hsla(0, 0%, 0%, 1)      |
| Light Grey  | `#D8E2EB` | 216, 226, 235    | —                       |
| Medium Grey | `#99A7B5` | 153, 167, 181    | —                       |

## Accent / Highlight Colours

| Name                 | HEX       | RGB              | HSL                     |
|----------------------|-----------|------------------|-------------------------|
| Teal Highlight       | `#2CDDE9` | 44, 221, 233     | hsla(184, 81%, 54%, 1)  |
| Light Teal Highlight | `#A2F4FD` | 162, 244, 253    | hsla(187, 96%, 81%, 1)  |

## Tertiary / Status Colours

> Use sparingly — primarily in product graphics and for success/error communications.

| Name             | HEX       | RGB              | HSL                     |
|------------------|-----------|------------------|-------------------------|
| Tertiary Green   | `#7BF1A8` | 123, 241, 168    | hsla(143, 80%, 71%, 1)  |
| Tertiary Yellow  | `#FDC700` | 253, 199, 0      | hsla(47, 100%, 50%, 1)  |
| Tertiary Red     | `#FF6550` | 255, 101, 80     | hsla(5, 100%, 66%, 1)   |

---

## CMYK Values (for print)

| Name            | CMYK                  |
|-----------------|-----------------------|
| Bitwarden Blue  | 84%, 66%, 0%, 0%      |
| Deep Blue       | 100%, 91%, 26%, 12%   |
| Off White       | 3%, 1%, 1%, 0%        |
| True White      | 0%, 0%, 0%, 0%        |
| True Black      | 75%, 68%, 67%, 90%    |
| Light Grey      | 14%, 6%, 3%, 0%       |
| Teal Highlight  | 58%, 0%, 15%, 0%      |
| Green           | 49%, 0%, 30%, 5%      |
| Red             | 0%, 60%, 69%, 0%      |

---

## CSS Custom Properties (copy-paste ready)

```css
:root {
  /* Primary */
  --bw-blue: #175DDC;
  --bw-deep-blue: #0C3276;

  /* Neutrals */
  --bw-off-white: #F3F6F9;
  --bw-white: #FFFFFF;
  --bw-black: #000000;
  --bw-light-grey: #D8E2EB;
  --bw-medium-grey: #99A7B5;

  /* Accents */
  --bw-teal: #2CDDE9;
  --bw-light-teal: #A2F4FD;

  /* Status / Tertiary */
  --bw-green: #7BF1A8;
  --bw-yellow: #FDC700;
  --bw-red: #FF6550;
}
```

## Tailwind CSS Config

```js
// tailwind.config.js — extend.colors
bitwarden: {
  blue:        '#175DDC',
  'deep-blue': '#0C3276',
  'off-white': '#F3F6F9',
  white:       '#FFFFFF',
  black:       '#000000',
  'light-grey':'#D8E2EB',
  'medium-grey':'#99A7B5',
  teal:        '#2CDDE9',
  'light-teal':'#A2F4FD',
  green:       '#7BF1A8',
  yellow:      '#FDC700',
  red:         '#FF6550',
}
```
