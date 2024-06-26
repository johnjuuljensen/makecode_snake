namespace snake {

    interface ImageMap {
        [n: number]: Image
    }

    // coprime 1200 = 197

    function encodeVelocity(dir: number, dist: number) {
        return (dir & 3) | ((dist & 15) << 2);
    }

    function decodeVelocity(dircode: number) {
        return [
            (dircode & 3),
            (dircode >> 2) & 15
        ];
    }

    function velocityToCoord(velocity: number) {
        const [dir, dist] = decodeVelocity(velocity);
        const xOffset = dir === 0 ? -1 : dir === 1 ? 1 : 0;
        const yOffset = dir === 2 ? -1 : dir === 3 ? 1 : 0;
        return [xOffset * dist, yOffset * dist];
    }

    function applyVelocity(x: number, y: number, velocity: number) {
        const d = velocityToCoord(velocity);
        return [x + d[0], y + d[1]];
    }

    //% blockNamespace=snake
    //% block="Setup level $level"
    //% level.shadow=screen_image_picker
    export function setup(level: Image) {
        const w = level.width
        const h = level.height
        let x = w / 2
        let y = h / 2
        let tx = x
        let ty = y
        let oy = x
        let ox = y
        const defaultSpeed = 150;
        let speed = defaultSpeed;
        const dw = scene.screenWidth() / w
        const dh = scene.screenHeight() / h
        let growNext = 1, growRemain = 2
        let oldTime = 0
        let snakeLength = -1

        let background: Image = image.create(scene.screenWidth(), scene.screenHeight());
        background.blit(0, 0, background.width, background.height, level, 0, 0, w, h, true, false)
        scene.setBackgroundImage(background);

        const breakableWallCol = 13;
        const foodCol = 14;
        const backgroundCol = 15;

        const [left, right, up, down] = [0, 1, 2, 3];
        let dirQueue: number[] = [];
        let curVelocity = encodeVelocity(down, 1);
        let oldVelocity = curVelocity, nextVelocity = curVelocity;

        const addIfValid = (newDir: number) => {
            newDir = encodeVelocity(newDir, 1);
            if (newDir !== (dirQueue[dirQueue.length - 1] || curVelocity)) {
                dirQueue.push(newDir)
            }
        };

        controller.up.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(up));
        controller.down.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(down));
        controller.left.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(left));
        controller.right.onEvent(ControllerButtonEvent.Pressed, () => addIfValid(right));
        // controller.A.onEvent(ControllerButtonEvent.Pressed, () => {
        //     if (!dirQueue.length) {
        //         const [dir] = decodeVelocity(curVelocity);
        //         dirQueue = [encodeVelocity(dir, 5), curVelocity];
        //     }
        // });


        let buffer: Buffer = Buffer.create(w * h);

        for (let y = 0; y < h; ++y)
            for (let x = 0; x < w; ++x) {
                let col = level.getPixel(x, y);
                col = col === backgroundCol ? 0 : col;
                buffer.setUint8(y * w + x, col);
            }

        const bufGet = (x: number, y: number) => buffer.getUint8(y * w + x);
        const bufGetDir = (x: number, y: number, velocity: number) => {
            [x, y] = applyVelocity(x, y, velocity);
            return bufGet(x, y);
        }
        const bufSet = (x: number, y: number, col: number) => buffer.setUint8(y * w + x, col);



        const headPics: ImageMap = {};
        headPics[up] = assets.image`head_v`;
        headPics[down] = assets.image`head_v`; headPics[down].flipY();
        headPics[left] = assets.image`head_h`;
        headPics[right] = assets.image`head_h`; headPics[right].flipX();

        const safeCols = [0, foodCol, backgroundCol]

        const bodyve = assets.image`body_v`;
        const bodyvu = assets.image`body_v`; bodyvu.flipX();
        const bodyhe = assets.image`body_h`;
        const bodyhu = assets.image`body_h`; bodyhu.flipY();
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
                    drawCell(ri % w, ri / w | 0, foodCol);
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
            drawCell(tx, ty, backgroundCol);
            [tx, ty] = applyVelocity(tx, ty, haleDir);
        }

        const sletHalePartial = (f: number) => {
            let haleVel = bufGet(tx, ty);
            const [dir] = decodeVelocity(haleVel);
            
            const [xf, yf, wf, hf] =
                dir === up ? [0, 1-f, dw, dh*f] :
                dir === down ? [0, 0, dw, dh*f] :
                dir === left ? [1-f, 0, dw*f, dh] :
                [0, 0, dw*f, dh]; // dir === right ? 

            background.fillRect((tx+xf) * dw, (ty+yf) * dh , Math.ceil(wf), Math.ceil(hf), backgroundCol);
        }

        const tegnHoved = (f: number) => {
            const [dir] = decodeVelocity(curVelocity);
            const tempX = ox + (x-ox)*f;
            const tempY = oy + (y-oy)*f;
            background.blit(tempX * dw, tempY * dh, dw, dh, headPics[dir], 0, 0, dw, dh, false, false)
        }

        const tegnKrop = () => {
            bufSet(ox, oy, curVelocity);
            let body = assets.image`bend`
            if (oldVelocity == curVelocity) {
                body = oldVelocity < encodeVelocity(up, 1)
                    ? (ox % 2 ? bodyhu : bodyhe)
                    : (oy % 2 ? bodyvu : bodyve);
            }
            background.blit(ox * dw, oy * dh, dw, dh, body, 0, 0, body.width, body.height, false, false)
        }


        const move = () => {
            oldVelocity = curVelocity;
            if (dirQueue.length) {
                nextVelocity = dirQueue.shift();
                if (safeCols.indexOf(bufGetDir(x, y, nextVelocity)) === -1) {
                    nextVelocity = curVelocity;
                }
            }

            curVelocity = nextVelocity;
            [x, y] = applyVelocity(x, y, curVelocity);
        }

        setFood()
        setFood()
        setFood()

        
        //game.consoleOverlay.setVisible(true)
        game.onUpdate(function () {
            const time = game.runtime();
            if (oldTime === 0) {
                oldTime = time-speed;
            }
            const [curDir] = decodeVelocity(curVelocity);
            const aboutToHitSomething =
                !dirQueue.length
                && safeCols.indexOf(bufGetDir(x, y, curVelocity)) === -1
                //bufGetDir(x, y, curVelocity) !== 0
                //|| bufGetDir(x, y, encodeVelocity(curDir, 2))
                ;
            {
                const oldSpeed = speed;
                speed = aboutToHitSomething ? defaultSpeed * 10 : defaultSpeed;
                // Adjust oldTime so ftime stays monotomic

                const ftime = (time - oldTime) / oldSpeed;
                oldTime = time - ftime * speed;
            }


            if (time - oldTime >= speed) {
                [ox, oy, oldTime] = [x, y, time]
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
                        snakeLength -= 1;
                        if (snakeLength <= 1) {
                            game.gameOver(false);
                        }
                    }
                    if (snakeLength < 5) {
                        background.replace(10, 13);
                    }
                } else if (ramtFarve != 0) {
                    info.setScore(snakeLength)
                    info.saveHighScore()
                    game.gameOver(true)
                }
                if (growRemain > 0) {
                    growRemain--;
                    const oldSnakeLength = snakeLength;
                    snakeLength++;
                    if (oldSnakeLength < 5 && snakeLength >= 5) {
                        background.replace(13, 10);
                    }
                } else {
                    sletHale();
                }
            }

            tegnKrop();
            const ftime = (time - oldTime) / speed;
            tegnHoved(ftime);
            sletHalePartial(ftime);
        })
    }
}
