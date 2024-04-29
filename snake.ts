namespace snake {

    interface ImageMap {
        [n: number]: Image        
    }

// coprime 1200 = 197

    function decodeDir(dir: number) {
        if (dir === 0) return [0, 0];
        const mul = dir >> 2;
        dir = dir & 3;
        const x = (dir-2) * (1 - mul);
        const y = (dir-2) * mul;
        return [x , y];
    }

    function applyDir(x: number, y: number, dir: number) {
        const d = decodeDir(dir);
        return [x + d[0], y + d[1]];
    }

    //% blockNamespace=snake
    //% block="Setup level $level"
    //% level.shadow=screen_image_picker
    export function setup(level_: Image) {
        const up: number = 5;   // 0b101
        const down: number = 7; // 0b111
        const left: number = 1; // 0b10
        const right: number = 3;// 0b11
        let dirs = [up, down, left, right];

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

        let growNext = 0, growRemain = 0
        let oldTime = 0
        let dir = down
        let oldDir = dir, nextDir = dir
        let snakeLength = 1

        let headPics: ImageMap = {};
        headPics[up] = assets.image`head`;
        headPics[down] = assets.image`head`; headPics[down].flipY();
        headPics[left] = assets.image`head`.transposed();
        headPics[right] = assets.image`head`.transposed(); headPics[right].flipX();

        let safeCols = [0, 2, 15]

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
                    buffer.setUint8(ri, 2);
                    drawCell(ri%w, ri/w|0, 2);
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
                body = oldDir < 4
                    ? (x % 2 ? bodyhu : bodyhe)
                    : (y % 2 ? bodyvu : bodyve);
            }
            background.blit(ox * dw, oy * dh, dw, dh, body, 0, 0, body.width, body.height, true, false)
        }

        
        const keyCheck = () => {
            if (controller.up.isPressed() && dir != down) {
                nextDir = up;
            } else if (controller.down.isPressed() && dir != up) {
                nextDir = down;
            } else if (controller.left.isPressed() && dir != right) {
                nextDir = left;
            } else if (controller.right.isPressed() && dir != left) {
                nextDir = right;
            }

            if (nextDir != dir && safeCols.indexOf(bufGetDir(x, y, nextDir)) == -1) {
                nextDir = dir;
            }
        }

        const move = () => {
            oldDir = dir;
            dir = nextDir;
            [x,y] = applyDir(x, y, dir);
        }

        setFood()
        setFood()
        setFood()
        game.consoleOverlay.setVisible(true)
        game.onUpdate(function () {
            // color.setColor(13, 0xFF0000, 4)
            keyCheck()
            const time = game.runtime()
            if (time - oldTime > dtime) {
                oldTime = time
                ox = x
                oy = y
                move()
                let ramtFarve = bufGet(x, y)
                if (ramtFarve == 2) {
                    music.play(music.melodyPlayable(music.knock), music.PlaybackMode.InBackground)
                    setFood()
                    growRemain += growNext
                    growNext += 1
                } else if (ramtFarve == 13) {
                    for (let i = 0; i <= 2; i++) {
                        sletHale()
                        snakeLength += -1
                        if (snakeLength <= 1) {
                            game.gameOver(false)
                        }
                    }
                    if (snakeLength < 5) {
                        background.replace(10,13);
                        //color.setColor(13, 16506837, 10)
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
                        //color.setColor(13, 11419120, 1000)
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
