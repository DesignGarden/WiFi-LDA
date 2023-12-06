// This class is incomplete and currently not in use.

export default class ImageAnalysis
{
    async GetGuessByOverlaps()
    {
        let overlaps = await this.getOverlaps(layer);

        if (overlaps.length === 0) return null;

        let guesses = [];

        for (let i in overlaps)
        {
            let left = overlaps[i][0], right = overlaps[i][0], top = overlaps[i][0], bot = overlaps[i][0];

            for (let k in overlaps[i])
            {
                if (overlaps[i][k].x < left.x) left = overlaps[i][k];

                if (overlaps[i][k].x > right.x) right = overlaps[i][k];

                if (overlaps[i][k].y < top.y) top = overlaps[i][k];

                if (overlaps[i][k].y > bot.y) bot = overlaps[i][k];
            }

            let guess = {
                x: (right.x - left.x) / 2 + left.x,
                y: (bot.y - top.y) / 2 + top.y,
                area: overlaps[i].length,
                withinZones: false
            };

            for (let k in zones)
                if (zones[k].ContainsPosition(guess.x, guess.y))
                {
                    guess.withinZones = true;
                    break;
                }

            guesses.push(guess);
        }

        guesses.sort((a, b) => b.withinZones === a.withinZones ? b.area - a.area : (b.withinZones ? 1 : -1));

        return guesses[0];
    }

    async getOverlaps(layer)
    {
        let rings = layer.getChildren((node) => node.getClassName() === 'Circle');
        //console.log("rings", rings.length);
        if (rings.length === 0) return [];

        let bounds = this._getBoundsFromRings(rings);

        let c = layer.getCanvas().getContext();

        let grid = new Array(layer.getCanvas().height);

        let darkest = this.getDarkestPixel(layer);
        //console.log("darkest", darkest);

        for (let y = Math.max(bounds.top, 0); y < Math.min(bounds.bottom, Math.pow(2, 32)); y++)
        {
            let data = c.getImageData(0, y, layer.getCanvas().width, 1).data;
            let line = new Array(data.length / 4);
            for (var x = 0; x < data.length; x += 4)
            {
                let color = new Color(data[x], data[x + 1], data[x + 2], data[x + 3]);

                line[x / 4] = color.a === darkest.color.a;
            }
            grid[y] = line;
        }

        let resolution = 1;//parseInt(3.048 * METERS_TO_PIXELS / 40);

        let overlaps = await this.splitByContiguos(grid, resolution);

        return overlaps;
    }

    async splitByContiguos(grid, resolutionDivider)
    {
        let ret = [];

        this.processed = {};

        for (let y = 0; y < grid.length; y += resolutionDivider)
            if (grid[y] !== undefined)
                for (let x = 0; x < grid[y].length; x += resolutionDivider)
                    if (grid[y][x])
                        if (!this._alreadyProcessed(this.processed, x, y))
                        {
                            let points = [];
                            await this._getAllContigousPoints(grid, x, y, 0, 0, points, this.processed, resolutionDivider);
                            ret.push(points);
                        }

        return ret;
    }

    async _getAllContigousPoints(grid, prevX, prevY, dx, dy, points, processed, resolutionDivider)
    {
        prevX = parseInt(prevX);
        prevY = parseInt(prevY);
        dx = parseInt(dx);
        dy = parseInt(dy);

        let x = prevX + dx;
        let y = prevY + dy;

        if (grid[y] === undefined || grid[y][x] === undefined)
            // TODO: I think this happens because of the resolutionDivider...
            return;

        if (!grid[y][x]) return;

        if (this._alreadyProcessed(processed, x, y)) return;

        this.processed[x][y] = true;

        points.push({ x: x, y: y });

        let moves = [
            [resolutionDivider, 0],
            [0, resolutionDivider],
            [-resolutionDivider, 0],
            [0, -resolutionDivider]
        ];

        for (let i in moves)
            await this._getAllContigousPoints(grid, x, y, moves[i][0], moves[i][1], points, processed, resolutionDivider);

        return;
    }

    _alreadyProcessed(processed, x, y)
    {
        if (processed[x] == null) processed[x] = {};

        else if (processed[x][y] === true)
        {
            return true;
        }

        return false;
    }

    _getBoundsFromRings(rings)
    {
        let ret =
        {
            top: null,
            left: null,
            right: null,
            bottom: null
        };

        for (let i in rings)
        {

            if (i === 'length') continue;
            if (i === 'each') continue;
            if (rings[i].y === undefined) continue;

            let bounds =
            {
                top: rings[i].y() - rings[i].radius(),
                left: rings[i].x() - rings[i].radius(),
                right: rings[i].x() + rings[i].radius(),
                bottom: rings[i].y() + rings[i].radius()
            };

            // TODO: conversion to int could shave off some data...
            ret.top = parseInt(Math.min(ret.top, bounds.top));
            ret.left = parseInt(Math.min(ret.left, bounds.left));
            ret.right = parseInt(Math.max(ret.right, bounds.right));
            ret.bottom = parseInt(Math.max(ret.bottom, bounds.bottom));
        }

        return ret;
    }
}