import Konva from "Konva";

export default class Zone
{
    static zoneCount = 1;
    Id = 0;

    constructor(layer, x, y, metersToPixels)
    {
        this.headCount = 0;
        this.Id = Zone.zoneCount++;
        this.update = (activeAnchor) =>
        {
            var group = this.zoneGroup;//activeAnchor.getParent();

            var topLeft = group.find('.topLeft')[0];
            var topRight = group.find('.topRight')[0];
            var bottomRight = group.find('.bottomRight')[0];
            var bottomLeft = group.find('.bottomLeft')[0];
            var rect = group.find('Rect')[0];

            if (activeAnchor != null)
            {
                var anchorX = activeAnchor.getX();
                var anchorY = activeAnchor.getY();

                // update anchor positions

                switch (activeAnchor.getName())
                {
                    case 'topLeft':
                        topRight.y(anchorY);
                        bottomLeft.x(anchorX);
                        break;
                    case 'topRight':
                        topLeft.y(anchorY);
                        bottomRight.x(anchorX);
                        break;
                    case 'bottomRight':
                        bottomLeft.y(anchorY);
                        topRight.x(anchorX);
                        break;
                    case 'bottomLeft':
                        bottomRight.y(anchorY);
                        topLeft.x(anchorX);
                        break;
                }
            }

            rect.position(topLeft.position());

            this.border.points([
                this.anchorTopLeft.x(), this.anchorTopLeft.y(),
                this.anchorTopRight.x(), this.anchorTopRight.y(),
                this.anchorBottomRight.x(), this.anchorBottomRight.y(),
                this.anchorBottomLeft.x(), this.anchorBottomLeft.y(),
                this.anchorTopLeft.x(), this.anchorTopLeft.y()
            ]);

            var width = topRight.getX() - topLeft.getX();
            var height = bottomLeft.getY() - topLeft.getY();
            if (width && height)
            {
                rect.width(width);
                rect.height(height);
            }
        };

        this.addAnchor = function (group, x, y, name, update)
        {
            var stage = group.getStage();
            var layer = group.getLayer();

            var anchor = new Konva.Circle({
                x: x,
                y: y,
                opacity: 0,
                stroke: '#666',
                fill: '#ddd',
                strokeWidth: 2,
                radius: 8,
                name: name,
                draggable: true,
                dragOnTop: false,
            });

            anchor.on('dragmove', function ()
            {
                update(this);
                layer.draw();
            });
            anchor.on('mousedown touchstart', function ()
            {
                group.draggable(false);
                this.moveToTop();
            });
            anchor.on('dragend', function ()
            {
                group.draggable(true);
                layer.draw();
            });
            // add hover styling
            anchor.on('mouseover', function ()
            {
                var layer = this.getLayer();
                document.body.style.cursor = 'pointer';
                // this.strokeWidth(4);
                layer.draw();
            });
            anchor.on('mouseout', function ()
            {
                var layer = this.getLayer();
                document.body.style.cursor = 'default';
                // this.strokeWidth(2);
                layer.draw();
            });

            group.add(anchor);

            return anchor;
        };

        this._label = new Konva.Label({
            x: 0,
            y: 0,
            draggable: false
        });

        this._text = new Konva.Text({
            x: 2,
            y: 5,
            text: 0,
            fontSize: 10,
            lineHeight: 1.2,
            fill: 'black',
            draggable: false
        });

        this._label.add(this._text);

        this.object = new Konva.Rect({
            x: 0,
            y: 0,
            width: 20 * metersToPixels,
            height: 20 * metersToPixels,
            fill: 'transparent',
            stroke: 'rgb(0,0,100)',
            strokeWidth: 2,
            draggable: false
        });

        this.border = new Konva.Line({
            stroke: 'black',
            strokeWidth: 1,
            opacity: 0.75,
            points: [
                0, 0,
                1, 0,
                1, 1,
                0, 1,
                0, 0
            ]
        });

        // add cursor styling
        this.object.on('mouseover', function ()
        {
            document.body.style.cursor = 'pointer';
        });
        this.object.on('mouseout', function ()
        {
            document.body.style.cursor = 'default';
        });

        this.zoneGroup = new Konva.Group({
            x: x,
            y: y,
            draggable: true
        });

        layer.add(this.zoneGroup);
        this.zoneGroup.add(this.border);
        this.zoneGroup.add(this.object);
        this.zoneGroup.add(this._label);
        this.anchorTopLeft = this.addAnchor(this.zoneGroup, 0, 0, 'topLeft', this.update);
        this.anchorTopRight = this.addAnchor(this.zoneGroup, this.object.attrs.width, 0, 'topRight', this.update);
        this.anchorBottomRight = this.addAnchor(this.zoneGroup, this.object.attrs.width, this.object.attrs.height, 'bottomRight', this.update);
        this.anchorBottomLeft = this.addAnchor(this.zoneGroup, 0, this.object.attrs.height, 'bottomLeft', this.update);

        this.Reset();
    }

    Delete()
    {
        this.zoneGroup.destroy();
    }

    Reset()
    {
        this.headCount = 0;
        this._label.getText().text("Zone ID: " + this.Id);
    }

    AddHeadCount(x, y)
    {
        if (!this.ContainsPosition(x, y)) return;
        this.headCount++;
        this._label.getText().text("Headcount: " + this.GetHeadCount() + " | " + "Zone ID: " + this.Id);
    }

    GetHeadCount()
    {
        return this.headCount;
    }

    ContainsPosition(x, y)
    {
        if (x < this.anchorTopLeft.x() + this.zoneGroup.x()) return false;
        if (y < this.anchorTopLeft.y() + this.zoneGroup.y()) return false;

        if (x > this.anchorTopRight.x() + this.zoneGroup.x()) return false;
        if (y < this.anchorTopRight.y() + this.zoneGroup.y()) return false;

        if (x > this.anchorBottomRight.x() + this.zoneGroup.x()) return false;
        if (y > this.anchorBottomRight.y() + this.zoneGroup.y()) return false;

        if (x < this.anchorBottomLeft.x() + this.zoneGroup.x()) return false;
        if (y > this.anchorBottomLeft.y() + this.zoneGroup.y()) return false;

        return true;
    }

    Save()
    {
        let flat = {};

        flat.x = this.zoneGroup.x();
        flat.y = this.zoneGroup.y();

        flat.anchors = {
            topLeft: {},
            topRight: {},
            bottomRight: {},
            bottomLeft: {}
        };

        flat.anchors.topLeft.x = this.anchorTopLeft.x();
        flat.anchors.topLeft.y = this.anchorTopLeft.y();
        flat.anchors.topRight.x = this.anchorTopRight.x();
        flat.anchors.topRight.y = this.anchorTopRight.y();
        flat.anchors.bottomRight.x = this.anchorBottomRight.x();
        flat.anchors.bottomRight.y = this.anchorBottomRight.y();
        flat.anchors.bottomLeft.x = this.anchorBottomLeft.x();
        flat.anchors.bottomLeft.y = this.anchorBottomLeft.y();

        return flat;
    }

    Load(flat)
    {
        this.Setup(
            flat,
            flat.anchors.topLeft,
            flat.anchors.topRight,
            flat.anchors.bottomRight,
            flat.anchors.bottomLeft
        );
    }

    SetupSimple(topLeft, topRight, bottomRight, bottomLeft)
    {
        this.Setup({ x: 0, y: 0 }, topLeft, topRight, bottomRight, bottomLeft);
    }

    Setup(center, topLeft, topRight, bottomRight, bottomLeft)
    {
        this.zoneGroup.x(center.x);
        this.zoneGroup.y(center.y);

        this.anchorTopLeft.x(topLeft.x);
        this.anchorTopLeft.y(topLeft.y);
        this.anchorTopRight.x(topRight.x);
        this.anchorTopRight.y(topRight.y);
        this.anchorBottomRight.x(bottomRight.x);
        this.anchorBottomRight.y(bottomRight.y);
        this.anchorBottomLeft.x(bottomLeft.x);
        this.anchorBottomLeft.y(bottomLeft.y);

        this._label.x(this.anchorTopLeft.x() + 2);
        this._label.y(this.anchorTopLeft.y() + 5);

        this.update();
    }
}