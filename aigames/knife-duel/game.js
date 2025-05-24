// game.js

var GameLayer = cc.Layer.extend({
    sprite: null,
    frames: [],
    moveFrames: [],
    isMoving: false,
    keyPressed: {},
    bow: null,
    arrowFrames: [],
    loadedArrowFrame: null,
    arrows: [],
    bowLoaded: false,
    arrowShot: null,
    arrowFlying: false,
    orcs: [],
    orcFrames: [],
    tilted: false,
    gravity: -1000,
    initialArrowSpeed: 800,
    facing: null,

    ctor: function () {
        this._super();

        var texture = cc.textureCache.addImage("assets/hero.png");
        var frameWidth = texture.width / 4;
        var frameHeight = texture.height / 4;

        // Load all frames
        for (var y = 0; y < 4; y++) {
            for (var x = 0; x < 4; x++) {
                var frame = new cc.SpriteFrame(
                    texture,
                    cc.rect(x * frameWidth, y * frameHeight, frameWidth, frameHeight)
                );
                this.frames.push(frame);
            }
        }

        // Set initial sprite
        this.sprite = new cc.Sprite(this.frames[0]);
        this.sprite.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
        // Scale hero to random size between 1.0 and 1.3
        this.sprite.setScale(1 + Math.random() * 0.3);
        this.addChild(this.sprite);

        this.bowLoaded   = false;
        this.arrowFlying = false;
        this.facing      = cc.p(1, 0);
        var bowTexture = cc.textureCache.addImage("assets/bow.png");
        var bowFrameWidth = bowTexture.width / 6;
        var bowFrameHeight = bowTexture.height;
        var bowFrame = new cc.SpriteFrame(
            bowTexture,
            cc.rect(bowFrameWidth * 2, 0, bowFrameWidth, bowFrameHeight)
        );
        this.bow = new cc.Sprite(bowFrame);
        this.bow.setScale(0.35);
        this.bow.setPosition(this.sprite.getPosition());
        this.addChild(this.bow);

        // Load arrow sprite sheet and spawn arrow pickups
        var arrowTexture = cc.textureCache.addImage("assets/arrow.png");
        var frameCount = 10;
        var arrowFrameWidth = arrowTexture.width / frameCount;
        var arrowFrameHeight = arrowTexture.height;
        this.arrowFrames = [];
        for (var i = 0; i < frameCount; i++) {
            var frame = new cc.SpriteFrame(
                arrowTexture,
                cc.rect(i * arrowFrameWidth, 0, arrowFrameWidth, arrowFrameHeight)
            );
            this.arrowFrames.push(frame);
        }
        this.arrows = [];
        var numArrows = this.arrowFrames.length * 3;
        for (var i = 0; i < numArrows; i++) {
            var arrow = new cc.Sprite(this.arrowFrames[i % this.arrowFrames.length]);
            arrow.setScale(0.5);
            arrow.setRotation(0);
            var marginX = arrowFrameWidth / 2;
            var marginY = arrowFrameHeight / 2;
            var x = marginX + Math.random() * (cc.winSize.width - 2 * marginX);
            var y = marginY + Math.random() * (cc.winSize.height - 2 * marginY);
            arrow.setPosition(cc.p(x, y));
            this.addChild(arrow);
            this.arrows.push(arrow);
        }

        // Load and spawn 5 orcs
        var orcTexture = cc.textureCache.addImage("assets/orc.png");
        var orcFrameWidth = orcTexture.width / 3;
        var orcFrameHeight = orcTexture.height / 4;
        // Build frames by direction: 0=up,1=right,2=down,3=left
        for (var dir = 0; dir < 4; dir++) {
            var frames = [];
            for (var col = 0; col < 3; col++) {
                frames.push(new cc.SpriteFrame(
                    orcTexture,
                    cc.rect(col * orcFrameWidth, dir * orcFrameHeight, orcFrameWidth, orcFrameHeight)
                ));
            }
            this.orcFrames.push(frames);
        }
        for (var i = 0; i < 5; i++) {
            var dir = Math.floor(Math.random() * 4);
            var orc = new cc.Sprite(this.orcFrames[dir][0]);
            orc.direction = dir;
            orc.speed = 50 + Math.random() * 50;
            orc.setPosition(
                Math.random() * cc.winSize.width,
                Math.random() * cc.winSize.height
            );
            this.addChild(orc);
            this.orcs.push(orc);
            // run walk animation
            var walkAnim = new cc.Animation(this.orcFrames[dir], 0.3);
            orc.runAction(cc.repeatForever(new cc.Animate(walkAnim)));
        }

        this.scheduleUpdate();

        // Add keyboard listener
        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyPressed: this.onKeyPressed.bind(this),
            onKeyReleased: this.onKeyReleased.bind(this)
        }, this);

        return true;
    },

    onKeyPressed: function (keyCode, event) {
        this.keyPressed[keyCode] = true;
        if (keyCode === cc.KEY.space) {
            if (this.bowLoaded && !this.arrowFlying) {
                this.fireArrow();
            }
        }
    },

    onKeyReleased: function (keyCode, event) {
        this.keyPressed[keyCode] = false;
    },

    update: function (dt) {
        this.bow.setPosition(this.sprite.getPosition());
        // handle temporary firing tilt
        if (this.tilted) {
            this.tilted = false;
        } else {
            var f = this.facing;
            var bowAngle;
            if (f.x < 0) {
                bowAngle = 180;
            } else if (f.x > 0) {
                bowAngle = 0;
            } else if (f.y > 0) {
                bowAngle = -90;
            } else if (f.y < 0) {
                bowAngle = 90;
            } else {
                bowAngle = 0;
            }
            this.bow.setRotation(bowAngle);
        }
        var f = this.facing;
        if (f.y > 0) {
            this.bow.setLocalZOrder(this.sprite.getLocalZOrder() - 1);
        } else {
            this.bow.setLocalZOrder(this.sprite.getLocalZOrder() + 1);
        }

        if (!this.bowLoaded) {
            for (var i = 0; i < this.arrows.length; i++) {
                var arr = this.arrows[i];
                if (cc.rectIntersectsRect(this.sprite.getBoundingBox(), arr.getBoundingBox())) {
                    this.loadBow(arr);
                    break;
                }
            }
        }
        if (this.keyPressed[cc.KEY.right] && !this.isMoving) {
            this.startMoveRight();
        }
        if (this.keyPressed[cc.KEY.left] && !this.isMoving) {
            this.startMoveLeft();
        }
        if (this.keyPressed[cc.KEY.up] && !this.isMoving) {
            this.startMoveUp();
        }
        if (this.keyPressed[cc.KEY.down] && !this.isMoving) {
            this.startMoveDown();
        }

        if (this.arrowFlying && this.arrowShot) {
            var arrow = this.arrowShot;
            arrow.vy += this.gravity * dt;
            var pos = arrow.getPosition();
            pos.x += arrow.vx * dt;
            pos.y += arrow.vy * dt;
            arrow.setPosition(pos);
            // rotate arrow to match trajectory
            var angleRad = Math.atan2(arrow.vy, arrow.vx);
            var angleDeg = -angleRad * 180 / Math.PI + 90;
            arrow.setRotation(angleDeg);
            if (pos.x < 0 || pos.x > cc.winSize.width || pos.y < 0 || pos.y > cc.winSize.height) {
                arrow.removeFromParent();
                this.arrowFlying = false;
                this.arrowShot = null;
            }
        }

        // Update orcs movement
        for (var j = 0; j < this.orcs.length; j++) {
            var o = this.orcs[j];
            var dx = 0, dy = 0;
            switch (o.direction) {
                case 0: dy = o.speed * dt; break;   // up
                case 1: dx = o.speed * dt; break;   // right
                case 2: dy = -o.speed * dt; break;  // down
                case 3: dx = -o.speed * dt; break;  // left
            }
            var pos = o.getPosition();
            pos.x += dx;
            pos.y += dy;
            // bounce on edges
            if (pos.x < 0 || pos.x > cc.winSize.width || pos.y < 0 || pos.y > cc.winSize.height) {
                o.direction = (o.direction + 2) % 4;
            } else {
                o.setPosition(pos);
            }
        }
    },

    startMoveRight: function () {
        this.isMoving = true;
        this.facing = cc.p(1, 0);

        var texture = cc.textureCache.addImage("assets/hero.png");
        var frameWidth = texture.width / 4;
        var frameHeight = texture.height / 4;

        this.moveFrames = [];
        var row = 3; // 4th row (index 3)

        for (var x = 0; x < 4; x++) {
            var frame = new cc.SpriteFrame(
                texture,
                cc.rect(x * frameWidth, row * frameHeight, frameWidth, frameHeight)
            );
            this.moveFrames.push(frame);
        }

        var moveAnim = new cc.Animation(this.moveFrames, 0.1);
        moveAnim.setRestoreOriginalFrame(false);
        var moveAnimate = new cc.Animate(moveAnim);

        var moveAction = cc.moveBy(0.1, cc.p(5, 0));

        var spawnActions = cc.spawn(moveAnimate, cc.repeat(moveAction, 4));

        var sequence = cc.sequence(
            spawnActions,
            cc.callFunc(function () {
                this.isMoving = false;
            }, this)
        );

        this.sprite.stopAllActions();
        this.sprite.setFlippedX(false);
        this.sprite.runAction(sequence);
    },

    startMoveLeft: function () {
        this.isMoving = true;
        this.facing = cc.p(-1, 0);

        var texture = cc.textureCache.addImage("assets/hero.png");
        var frameWidth = texture.width / 4;
        var frameHeight = texture.height / 4;

        this.moveFrames = [];
        var row = 2; // 3rd row (index 2)

        for (var x = 0; x < 4; x++) {
            var frame = new cc.SpriteFrame(
                texture,
                cc.rect(x * frameWidth, row * frameHeight, frameWidth, frameHeight)
            );
            this.moveFrames.push(frame);
        }

        var moveAnim = new cc.Animation(this.moveFrames, 0.1);
        moveAnim.setRestoreOriginalFrame(false);
        var moveAnimate = new cc.Animate(moveAnim);

        var moveAction = cc.moveBy(0.1, cc.p(-5, 0));

        var spawnActions = cc.spawn(moveAnimate, cc.repeat(moveAction, 4));

        var sequence = cc.sequence(
            spawnActions,
            cc.callFunc(function () {
                this.isMoving = false;
            }, this)
        );

        this.sprite.stopAllActions();
        this.sprite.setFlippedX(false);
        this.sprite.runAction(sequence);
    },

    startMoveUp: function () {
        this.isMoving = true;
        this.facing = cc.p(0, 1);

        var texture = cc.textureCache.addImage("assets/hero.png");
        var frameWidth = texture.width / 4;
        var frameHeight = texture.height / 4;

        this.moveFrames = [];
        var row = 1; // 2nd row (index 1)

        for (var x = 0; x < 4; x++) {
            var frame = new cc.SpriteFrame(
                texture,
                cc.rect(x * frameWidth, row * frameHeight, frameWidth, frameHeight)
            );
            this.moveFrames.push(frame);
        }

        var moveAnim = new cc.Animation(this.moveFrames, 0.1);
        moveAnim.setRestoreOriginalFrame(false);
        var moveAnimate = new cc.Animate(moveAnim);

        var moveAction = cc.moveBy(0.1, cc.p(0, 5));

        var spawnActions = cc.spawn(moveAnimate, cc.repeat(moveAction, 4));

        var sequence = cc.sequence(
            spawnActions,
            cc.callFunc(function () {
                this.isMoving = false;
                // Return to first frame of row 2 after movement
                this.sprite.setSpriteFrame(this.frames[4]); // First frame of row 2
            }, this)
        );

        this.sprite.stopAllActions();
        this.sprite.setFlippedX(false);
        this.sprite.runAction(sequence);
    },

    startMoveDown: function () {
        this.isMoving = true;
        this.facing = cc.p(0, -1);

        var texture = cc.textureCache.addImage("assets/hero.png");
        var frameWidth = texture.width / 4;
        var frameHeight = texture.height / 4;

        this.moveFrames = [];
        var row = 0; // 1st row (index 0)

        for (var x = 0; x < 4; x++) {
            var frame = new cc.SpriteFrame(
                texture,
                cc.rect(x * frameWidth, row * frameHeight, frameWidth, frameHeight)
            );
            this.moveFrames.push(frame);
        }

        var moveAnim = new cc.Animation(this.moveFrames, 0.1);
        moveAnim.setRestoreOriginalFrame(false);
        var moveAnimate = new cc.Animate(moveAnim);

        var moveAction = cc.moveBy(0.1, cc.p(0, -5));

        var spawnActions = cc.spawn(moveAnimate, cc.repeat(moveAction, 4));

        var sequence = cc.sequence(
            spawnActions,
            cc.callFunc(function () {
                this.isMoving = false;
                // Return to first frame of row 1 after movement
                this.sprite.setSpriteFrame(this.frames[0]); // First frame of row 1
            }, this)
        );

        this.sprite.stopAllActions();
        this.sprite.setFlippedX(false);
        this.sprite.runAction(sequence);
    },

    loadBow: function (arrowSprite) {
        this.bowLoaded = true;
        this.loadedArrowFrame = arrowSprite.getSpriteFrame();
        arrowSprite.removeFromParent();
        var idx = this.arrows.indexOf(arrowSprite);
        if (idx >= 0) {
            this.arrows.splice(idx, 1);
        }
    },

    fireArrow: function () {
        this.bowLoaded   = false;
        // tilt bow upwards when firing
        this.bow.setRotation(this.bow.getRotation() - 15);
        this.tilted = true;
        var dir = this.facing;
        var arrow = new cc.Sprite(this.loadedArrowFrame);
        arrow.setScale(0.5);
        var angle;
        if (dir.x > 0) {
            angle = 90;     // right
        } else if (dir.x < 0) {
            angle = -90;    // left
        } else if (dir.y > 0) {
            angle = 0;      // up
        } else if (dir.y < 0) {
            angle = 180;    // down
        } else {
            angle = 0;
        }
        arrow.setRotation(angle);
        arrow.setPosition(this.sprite.getPosition());
        this.addChild(arrow);

        arrow.vx = dir.x * this.initialArrowSpeed;
        // give sideways shots an upward initial component for an arc
        if (dir.x !== 0 && dir.y === 0) {
            arrow.vy = this.initialArrowSpeed * 0.5;
        } else {
            arrow.vy = dir.y * this.initialArrowSpeed;
        }
        this.arrowShot = arrow;
        this.arrowFlying = true;
    }
});

var GameScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new GameLayer();
        this.addChild(layer);
    }
});