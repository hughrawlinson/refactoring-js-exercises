class Classifier {
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
    this.chordCountsInLabels = new Map();
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

const wish = require('wish');
describe('the file', () => {
  var classifier = new Classifier();
  classifier.addSong('imagine', ['c', 'cmaj7', 'f', 'am', 'dm', 'g', 'e7'], 0);
  classifier.addSong('somewhereOverTheRainbow', ['c', 'em', 'f', 'g', 'am'], 0);
  classifier.addSong('tooManyCooks', ['c', 'g', 'f'], 0);
  classifier.addSong('iWillFollowYouIntoTheDark', ['f', 'dm', 'bb', 'c', 'a', 'bbm'], 1);
  classifier.addSong('babyOneMoreTime', ['cm', 'g', 'bb', 'eb', 'fm', 'ab'], 1);
  classifier.addSong('creep', ['g', 'gsus4', 'b', 'bsus4', 'c', 'cmsus4', 'cm6'], 1);
  classifier.addSong('paperBag', ['bm7', 'e', 'c', 'g', 'b7', 'f', 'em', 'a', 'cmaj7', 'em7', 'a7', 'f7', 'b'], 2);
  classifier.addSong('toxic', ['cm', 'eb', 'g', 'cdim', 'eb7', 'd7', 'db7', 'ab', 'gmaj7', 'g7'], 2);
  classifier.addSong('bulletproof', ['d#m', 'g#', 'b', 'f#', 'g#m', 'c#'], 2);
  classifier.trainAll();

  it('classifies', () => {
    const classified = classifier.classify(['f#m7', 'a', 'dadd9',
                                            'dmaj7', 'bm', 'bm7', 'd', 'f#m']);

    wish(classified.get('easy') === 1.3433333333333333);
    wish(classified.get('medium') === 1.5060259259259259);
    wish(classified.get('hard') === 1.6884223991769547);
  });

  it('classifies again', () => {
    const classified = classifier.classify(['d', 'g', 'e', 'dm']);

    wish(classified.get('easy') === 2.023094827160494);
    wish(classified.get('medium') === 1.855758613168724);
    wish(classified.get('hard') === 1.855758613168724);
  });

  it('label probabilities', () => {
    wish(classifier._labelProbabilities.get('easy') === 0.3333333333333333);
    wish(classifier._labelProbabilities.get('medium') ===0.3333333333333333);
    wish(classifier._labelProbabilities.get('hard') === 0.3333333333333333);
  });
});
