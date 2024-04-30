namespace snake {

    interface ImageMap {
        [n: number]: Image        
    }

// coprime 1200 = 197

    function normalizeDir(dir: number) {
        if (dir === 0) return [0, 0];
        const isY = dir < 6 ? 0 : 1;
        dir = dir - isY * 5 - 3;
        const isJump = Math.abs(dir) > 1 ? 1 : 0;
        dir = isJump ? dir / 2 : dir;
        return [dir, isY, isJump];
    }

    
    function decodeDir(dir: number) {
        let isY = 0;
        let isJump = 0;
        [dir, isY, isJump] = normalizeDir(dir);
        dir *= isJump ? 5 : 1;
        const x = dir * (1 - isY);
        const y = dir * isY;
        return [x , y];
    }

    function jumpDir(dir: number) {
        let mul = 0;
        [dir, mul] = normalizeDir(dir);
        dir *= 2;
        return dir + mul * 5 + 3;
    }

    function applyDir(x: number, y: number, dir: number) {
        const d = decodeDir(dir);
        return [x + d[0], y + d[1]];
    }

    //% blockNamespace=snake
    //% block="Setup level $level"
    //% level.shadow=screen_image_picker
    export function setup(level_: Image) {
        const breakableWallCol = 13;
        const foodCol = 14;

        const dirSplit: number = 6;
        const up: number = 7;   
        const down: number = 9; 
        const left: number = 2; 
        const right: number = 4;
        let dirs = [up, down, left, right];
        let dirQueue: number[] = [];
        let dir = down;
        let oldDir = dir, nextDir = dir;

        const addIfValid = (newDir: number) => {
            if (decodeDir(newDir)[1] !== decodeDir(dirQueue[dirQueue.length-1] || dir)[1]) {
                dirQueue.push(newDir)
            }
        };

        controller.up.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(up));
        controller.down.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(down));
        controller.left.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(left));
        controller.right.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(right));
        controller.A.onEvent(ControllerButtonEvent.Pressed, () => {
            dirQueue = dirQueue.concat([jumpDir(dir), dir]);
        });

        let w = level_.width
        let h = level_.height
        let x = w / 2
        let y = h / 2
        let tx = x
        let ty = y
        let oy = x
        let ox = y
        let dtime = 100
        let dw = scene.screenWidth() / w
        let dh = scene.screenHeight() / h
        let growNext = 0, growRemain = 20
        let oldTime = 0
        let snakeLength = 1


        let buffer: Buffer = Buffer.create(w * h);
        for (let y = 0; y < h; ++y)
            for (let x = 0; x < w; ++x){
                let col = level_.getPixel(x, y);
                col = col === 15 ? 0 : col;
                buffer.setUint8(y * w + x, col);
            }

        const bufGet = (x: number, y: number) => buffer.getUint8(y * w + x);
        const bufGetDir = (x: number, y: number, dir: number) => {
            [x, y] = applyDir(x, y, dir);
            return bufGet(x, y);
        }
        const bufSet = (x: number, y: number, col: number) => buffer.setUint8(y * w + x, col);

        let background: Image = image.create(scene.screenWidth(), scene.screenHeight());
        background.blit(0, 0, background.width, background.height, level_, 0, 0, w, h, true, false)
        scene.setBackgroundImage(background)


        let headPics: ImageMap = {};
        headPics[up] = headPics[up-1] = assets.image`head`;
        headPics[down] = headPics[down+1] = assets.image`head`; headPics[down].flipY();
        headPics[left] = headPics[left-1] = assets.image`head`.transposed();
        headPics[right] = headPics[right+1] = assets.image`head`.transposed(); headPics[right].flipX();

        let safeCols = [0, foodCol, 15]

        const bodyve = assets.image`body`;
        const bodyvu = assets.image`body`; bodyvu.flipX();
        const bodyhe = assets.image`body`.transposed();
        const bodyhu = assets.image`body`.transposed(); bodyhu.flipY();

        const drawCell = (x: number, y: number, col: number) => {
            background.fillRect(x * dw, y * dh, dw, dh, col)
        }
    
        const setFood = () => {
            // https://lemire.me/blog/2017/09/18/visiting-all-values-in-an-array-exactly-once-in-random-order/
            const prime = 197;
            const n = w * h;
            let ri = randint(1, n - 1);
            for (let i = 0; i < n; ++i) {
                if (buffer.getUint8(ri) === 0) {
                    buffer.setUint8(ri, foodCol);
                    drawCell(ri%w, ri/w|0, foodCol);
                    return;
                }

                ri = (ri + prime < n) ? 
                    ri + prime : 
                    ri + prime - n;
            }
        }

        const sletHale = () => {
            let haleDir = bufGet(tx, ty);
            bufSet(tx, ty, 0);
            drawCell(tx, ty, 15);
            [tx, ty] = applyDir(tx, ty, haleDir);
        }

        const tegnHoved = (x: number, y: number) => {
            background.blit(x * dw, y * dh, dw, dh, headPics[dir], 0, 0, dw, dh, false, false)
        }

        const tegnKrop = () => {
            bufSet(ox, oy, dir);
            let body = assets.image`bend`
            if (oldDir == dir) {
                body = oldDir < dirSplit
                    ? (x % 2 ? bodyhu : bodyhe)
                    : (y % 2 ? bodyvu : bodyve);
            }
            background.blit(ox * dw, oy * dh, dw, dh, body, 0, 0, body.width, body.height, true, false)
        }


        const move = () => {
            oldDir = dir;
            if (dirQueue.length && safeCols.indexOf(bufGetDir(x, y, dirQueue[0])) !== -1) {
                nextDir = dirQueue.shift();
            }

            dir = nextDir;
            [x,y] = applyDir(x, y, dir);
        }

        setFood()
        setFood()
        setFood()
        game.consoleOverlay.setVisible(true)
        game.onUpdate(function () {
            const time = game.runtime()
            if (time - oldTime > dtime) {
                oldTime = time
                ox = x
                oy = y
                move()
                let ramtFarve = bufGet(x, y)
                if (ramtFarve == foodCol) {
                    music.play(music.melodyPlayable(music.knock), music.PlaybackMode.InBackground)
                    setFood()
                    growRemain += growNext
                    growNext += 1
                } else if (ramtFarve == breakableWallCol) {
                    for (let i = 0; i <= 2; i++) {
                        sletHale()
                        snakeLength += -1
                        if (snakeLength <= 1) {
                            game.gameOver(false)
                        }
                    }
                    if (snakeLength < 5) {
                        background.replace(10,13);
                    }
                } else if (ramtFarve != 0) {
                    info.setScore(snakeLength)
                    game.gameOver(false)
                }
                if (growRemain > 0) {
                    growRemain--;
                    snakeLength++;
                    if (snakeLength >= 5) {
                        background.replace(13, 10);
                    }
                } else {
                    sletHale()
                }
                tegnKrop()
                tegnHoved(x, y)
            }
        })
    }        
    
            
}
