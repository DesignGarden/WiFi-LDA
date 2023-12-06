export default class GeoTransform
{
    /**
     * 
     * @param {number} lat 
     * @param {number} lng 
     * @param {*} transform 
     * @returns {object} The translated pixel coordinates, {x,y}.
     */
    static transformGeoToPixels(lat, lng, transform)
    {
        if (!(lat > 0 && lng < 0)) return null;

        const { actual } = transform;
        const translated = GeoTransform.translateGeo(lat, lng, transform.configured.geo, actual.geo);

        const geoRangeX = actual.geo.tl.lng - actual.geo.br.lng;
        const geoRangeY = actual.geo.tl.lat - actual.geo.br.lat;
        const pixelRangeX = actual.pixels.tl.x - actual.pixels.br.x;
        const pixelRangeY = actual.pixels.tl.y - actual.pixels.br.y;

        let xCoeffInRange = 1 - (translated.lng - actual.geo.br.lng) / geoRangeX;
        let yCoeffInRange = 1 - (translated.lat - actual.geo.br.lat) / geoRangeY;

        return {
            x: Math.abs(xCoeffInRange * pixelRangeX) + actual.pixels.tl.x,
            y: Math.abs(yCoeffInRange * pixelRangeY) + actual.pixels.tl.y
        };
    }

    static translateGeo(lat, lng, from, to)
    {
        // TODO: Account for rotation.

        const ret = { lat: 0, lng: 0 };

        const coeffLat = 1;//((to.tl.lat - to.br.lat) / (from.tl.lat - from.br.lat));
        const coeffLng = 1;//((to.tl.lng - to.br.lng) / (from.tl.lng - from.br.lng));

        const offsetLat = 0;//-1*(from.br.lat * coeffLat - to.br.lat);
        const offsetLng = 0;//-1*(from.br.lng * coeffLng - to.br.lng);

        ret.lat = lat * coeffLat + offsetLat;
        ret.lng = lng * coeffLng + offsetLng;

        return ret;
    }
}