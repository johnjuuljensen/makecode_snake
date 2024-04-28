namespace snake {
    //% blockNamespace=snake
    //% block="Setup level $level"
    //% level.shadow=screen_image_picker
    export function setup(level: Image) {
        level = level.clone()
        let w = level.width
        let h = level.height
        let x = w / 2
        let y = h / 2
        let tx = x
        let ty = y
        let oy = x
        let ox = y
        let dtime = 100
        let dw = scene.screenWidth() / w
        let dh = scene.screenHeight() / h

        let background: Image = image.create(scene.screenWidth(), scene.screenHeight());
        background.blit(0, 0, background.width, background.height, level, 0, 0, w, h, true, false)
        scene.setBackgroundImage(background)

        let growNext = 0
        let growRemain = 0
        let oldTime = 0
        let dir = 2
        let oldDir = dir
        let nextDir = dir
        let snakeLength = 1
        let head2 = assets.image`head`
        head2.flipY()

        let head4 = assets.image`head`.transposed()
        head4.flipX()

        let headPics = [
            assets.image`head`,
            head2,
            assets.image`head`.transposed(),
            head4,
        ]
        let safeCols = [0, 15, 1]

        const bodyv = assets.image`body`
        const bodyh = assets.image`body`.transposed()

  

        const drawCell = (x: number, y: number, col: number) => {
            level.setPixel(x, y, col)
            // picture.fillRect(x * dw, y * dh, dw, dh, 14)
            background.fillRect(x * dw, y * dh, dw, dh, col)
        }
    
        const setFood = () => {
            while (true) {
                let ix = randint(1, level.width - 1);
                let iy = randint(1, level.height - 1);
                if (level.getPixel(ix, iy) != 15) {
                    continue;
                } else {
                    drawCell(ix, iy, 5)
                    break;
                }
            }
        }

        const sletHale = () => {
            let haleDir = level.getPixel(tx, ty)
            drawCell(tx, ty, 15)
            if (haleDir == 1) {
                ty += -1
            } else if (haleDir == 2) {
                ty += 1
            } else if (haleDir == 3) {
                tx += -1
            } else if (haleDir == 4) {
                tx += 1
            }
        }

        const tegnHoved = (x: number, y: number) => {
            background.blit(x * dw, y * dh, dw, dh, headPics[dir - 1], 0, 0, dw, dh, false, false)
        }

        const tegnKrop = () => {
            level.setPixel(ox, oy, dir)
            let body = assets.image`bend`
            if (oldDir == dir) {
                if (oldDir > 2) {
                    body = bodyh
                    if (x % 2) {
                        body.flipY()
                    }
                } else {
                    body = bodyv
                    if (y % 2) {
                        body.flipX()
                    }
                }
            }
            background.blit(ox * dw, oy * dh, dw, dh, body, 0, 0, body.width, body.height, true, false)
        }
        
        const keyCheck = () => {
            if (controller.up.isPressed() && dir != 2) {
                nextDir = 1
            } else if (controller.down.isPressed() && dir != 1) {
                nextDir = 2
            } else if (controller.left.isPressed() && dir != 4) {
                nextDir = 3
            } else if (controller.right.isPressed() && dir != 3) {
                nextDir = 4
            }
            if (nextDir != dir) {
                if (nextDir == 1 && safeCols.indexOf(level.getPixel(x, y - 1)) == -1) {
                    nextDir = dir
                } else if (nextDir == 2 && safeCols.indexOf(level.getPixel(x, y + 1)) == -1) {
                    nextDir = dir
                } else if (nextDir == 3 && safeCols.indexOf(level.getPixel(x - 1, y)) == -1) {
                    nextDir = dir
                } else if (nextDir == 4 && safeCols.indexOf(level.getPixel(x + 1, y)) == -1) {
                    nextDir = dir
                }
            }
        }

        const move = () => {
            oldDir = dir
            dir = nextDir
            if (dir == 1) {
                y += -1
            } else if (dir == 2) {
                y += 1
            } else if (dir == 3) {
                x += -1
            } else if (dir == 4) {
                x += 1
            }
        }

        setFood()
        setFood()
        setFood()

        game.onUpdate(function () {
            // color.setColor(13, 0xFF0000, 4)
            keyCheck()
            const time = game.runtime()
            if (time - oldTime > dtime) {
                oldTime = time
                ox = x
                oy = y
                move()
                let ramtFarve = level.getPixel(x, y)
                if (ramtFarve == 5) {
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
                        color.setColor(13, 16506837, 10)
                    }
                } else if (ramtFarve != 15) {
                    info.setScore(snakeLength)
                    game.gameOver(false)
                }
                if (growRemain > 0) {
                    growRemain--;
                    snakeLength++;
                    if (snakeLength >= 5) {
                        color.setColor(13, 11419120, 1000)
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
