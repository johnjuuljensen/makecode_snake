namespace snake {

    interface ImageMap {
        [n: number]: Image        
    }

    // coprime 1200 = 197
    
    function encodeDir(dir: number, dist: number) {
       return (dir & 3) | ((dist & 15) << 2);
    }

    function decodeDir(dircode: number) {
        return [
            (dircode & 3),
            (dircode>>2) & 15
        ];
    }

    function dirToCoord(dircode: number) {
        const [dir, dist] = decodeDir(dircode);
        const xOffset = dir === 0 ? -1 : dir === 1 ? 1 : 0;
        const yOffset = dir === 2 ? -1 : dir === 3 ? 1 : 0;
        return [xOffset*dist , yOffset*dist];
    }

    function applyDir(x: number, y: number, dircode: number) {
        const d = dirToCoord(dircode);
        return [x + d[0], y + d[1]];
    }

    //% blockNamespace=snake
    //% block="Setup level $level"
    //% level.shadow=screen_image_picker
    export function setup(level_: Image) {
        const breakableWallCol = 13;
        const foodCol = 14;

        const [left, right, up, down] = [0, 1, 2, 3];
        let dirQueue: number[] = [];
        let curDir = encodeDir(down, 1);
        let oldDir = curDir, nextDir = curDir;

        const addIfValid = (newDir: number) => {
            newDir = encodeDir(newDir, 1);
            if (newDir !== (dirQueue[dirQueue.length-1] || curDir)) {
                dirQueue.push(newDir)
            }
        };

        controller.up.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(up));
        controller.down.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(down));
        controller.left.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(left));
        controller.right.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(right));
        controller.A.onEvent(ControllerButtonEvent.Pressed, () => {
            if (!dirQueue.length) {
                const [dir] = decodeDir(curDir);
                dirQueue = [encodeDir(dir, 5), curDir];
            }
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
        headPics[up] = assets.image`head`;
        headPics[down] = assets.image`head`; headPics[down].flipY();
        headPics[left] = assets.image`head`.transposed();
        headPics[right] = assets.image`head`.transposed(); headPics[right].flipX();

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
            const [dir] = decodeDir(curDir);
            background.blit(x * dw, y * dh, dw, dh, headPics[dir], 0, 0, dw, dh, false, false)
        }

        const tegnKrop = () => {
            bufSet(ox, oy, curDir);
            let body = assets.image`bend`
            if (oldDir == curDir) {
                body = oldDir < encodeDir(up, 1)
                    ? (x % 2 ? bodyhu : bodyhe)
                    : (y % 2 ? bodyvu : bodyve);
            }
            background.blit(ox * dw, oy * dh, dw, dh, body, 0, 0, body.width, body.height, true, false)
        }


        const move = () => {
            oldDir = curDir;
            if (dirQueue.length) {
                nextDir = dirQueue.shift();
                if (safeCols.indexOf(bufGetDir(x, y, nextDir)) === -1) {
                    nextDir = curDir;
                }
            }

            curDir = nextDir;
            [x,y] = applyDir(x, y, curDir);
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
                let ramtFarve = bufGet(x, y);
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
