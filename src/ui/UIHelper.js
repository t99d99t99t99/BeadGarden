/**
 * 
 * @param {number} x 
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function isClicked(x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h && mouseIsPressed;
}

function isHovered(x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}