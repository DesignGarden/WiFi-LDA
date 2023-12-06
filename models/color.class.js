export default class Color
{
    static ColorIndex = 0;

    static HighContrast = [
        '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
        '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff',
        '#9a6324', '#800000', '#aaffc3', '#808000',
        '#000075', '#808080', '#000000'
    ];

    _string = null;

    constructor(r, g, b, a = 1)
    {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    SetRgba(r, g, b, a = this.a)
    {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    }

    NextHighContrast()
    {
        this._string = Color.HighContrast[Color.ColorIndex];

        const { r, g, b } = this._hexToRgb(this._string);

        this.SetRgba(r, g, b, this.a);

        Color.ColorIndex = (Color.ColorIndex + 1) % Color.HighContrast.length;
        return this;
    }

    /**
     * 
     * @param {number} alpha The alpha value to use. Defaults to the current alpha value.
     * @returns 
     */
    AsStyle = (alpha = this.a) => `rgba(${this.r},${this.g},${this.b},${alpha})`;

    /**
     * 
     * @param {string} mac 
     * @returns A new Color object.
     */
    SetRgbFromMac(mac)
    {
        const [, , , rHex, gHex, bHex] = mac.split(':');

        let r = parseInt(rHex, 16);
        let g = parseInt(gHex, 16);
        let b = parseInt(bHex, 16);

        const min = Math.min(r, g, b);
        this.SetRgba(r - min, g - min, b - min, this.a);
        return this;
    }

    _hexToRgb(hex)
    {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return {
            r: parseInt(result?.[1] || 0, 16),
            g: parseInt(result?.[2] || 0, 16),
            b: parseInt(result?.[3] || 0, 16)
        };
    }
}