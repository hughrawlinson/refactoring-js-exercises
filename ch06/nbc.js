module.exports = class Classifier {
  constructor() {
    this._songList = {
      allChords: new Set(),
      difficulties: ['easy', 'medium', 'hard'],
      songs: [],
      addSong: function(name, chords, difficulty) {
        this.songs.push({name, chords, difficulty: this.difficulties[difficulty]});
      }
    };
    this._labelCounts = new Map();
    this._labelProbabilities = new Map();
    this._smoothing = 1.01;
  }

  _chordCountForDifficulty(difficulty, testChord){
    return this._songList.songs.reduce((counter, song) => {
      return counter + (song.difficulty === difficulty
           ? song.chords.filter(chord => chord === testChord).length
           : 0);
    }, 0);
  }

  _likelihoodFromChord(difficulty, chord) {
    return this._chordCountForDifficulty(difficulty, chord) / this._songList.songs.length;
  }

  _valueForChordDifficulty(difficulty, chord) {
    const value = this._likelihoodFromChord(difficulty, chord);
    return value ? value + this._smoothing : 1;
  }

  _train(chords, label){
    chords.forEach(chord => this._songList.allChords.add(chord));
    if(Array.from(this._labelCounts.keys()).includes(label)){
      this._labelCounts.set(label, this._labelCounts.get(label) + 1);
    } else {
      this._labelCounts.set(label, 1);
    }
  }

  _setLabelProbabilities(){
    this._labelCounts.forEach((_count, label) => {
      this._labelProbabilities.set(label,
                                  this._labelCounts.get(label) / this._songList.songs.length);
    });
  }

  addSong(...songParams) {
    this._songList.addSong(...songParams);
  }

  trainAll() {
    this._songList.songs.forEach(({song, chords, difficulty}) => {
      this._train(chords, difficulty);
    });
    this._setLabelProbabilities();
  }

  classify(chords){
    return new Map(Array
      .from(this._labelProbabilities.entries())
      .map(labelWithProbability => {
        const difficulty = labelWithProbability[0]
        return [difficulty,
                chords.reduce(
                  (total, chord) => total * this._valueForChordDifficulty(difficulty, chord),
                  this._labelProbabilities.get(difficulty) + this._smoothing)];
      }));
  }
};
