(function () {
  const _origText = p5.prototype.text;

  p5.prototype.text = function (str, x, y, w, h) {
    const s = String(str);
    const hasLatin = /[A-Za-z]/.test(s);
    const hasKorean = /[가-힯ᄀ-ᇿ㄰-㆏]/.test(s);

    if (hasLatin && !hasKorean) {
      this.textFont('Dot Matrix');
      const result = _origText.call(this, str, x, y, w, h);
      this.textFont('DungGeunMo');
      return result;
    }

    return _origText.call(this, str, x, y, w, h);
  };
})();
