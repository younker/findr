import Selections from './selections';

class Matcher {
  constructor (string) {
    this.string = (string || '').toLowerCase();
    this.previousMatches = {};
  }

  matches(query, queryId) {
    if ( this.hasMatchData(query) ) return this.matchData(query);

    let match = false;
    let locations = [];
    let q = query.toLowerCase();
    let qlen = q.length;
    let j = 0;

    // Was the last character a match?
    let run = false;

    for ( let i = 0; i < this.string.length && !match; i++) {
      var strChar = this.charAt(i);
      var queryChar = q[j];

      if ( strChar != queryChar ) {
        // We failed to match so if we were on a run, it has ended
        run = false;
      } else if ( run ) {
        // The previous iteration found a match. That means we are currently
        // on a run of matching characters. This is an easy step since we
        // just want to increment the end position for the most recent
        // locData object (in locations)
        var last = locations.pop();
        last[1]++;
        j++;
        locations.push(last);
      } else {
        // First match we have seen in at least 1 full iteration. If the
        // next iteration matches, be sure to append to this locData
        run = true;

        // Think slice(). Location data will be an array where the first
        // value is the index of the first match and the second value is
        // the index of the last match.
        let locData = [i, i+1];

        // Match the largest chunks of matching text together!
        // Check to see if the last character in the query string matches
        // the last character in this.string. If so, steal that characters
        // location data (from the previous locData found at locations.last)
        // and prepend it to this match data.
        // For example, if we want to match 'dm', doing a "first come, first
        // match" would produce this match (matches are in caps):
        //   '/Dz/a/dMoz'
        // However, we want to match as many consecutive strings as possible,
        // thus the match should be:
        //   '/dz/a/DM'
        let cont = true;
        for ( var k = 1; k <= i && cont; k++) {
          let prevStrChar = this.charAt(i - k);
          let prevQueryChar = q[j - k];
          cont = prevStrChar == prevQueryChar;
          if ( cont ) {
            // query: dm
            // string: fsdlsdmoz
            // prev: [2,3] --> [2,2] --> remove it
            // curr: [6,7] --> [5,7]
            let prevLocData = locations.pop();
            prevLocData[1]--;

            // Only persist the previous location data if it has at least 1 match
            if ( prevLocData[0] < prevLocData[1] ) locations.push(prevLocData);

            // Now, move the start position back 1 for the current match
            locData[0]--;
          }
        }
        locations.push(locData);
        j++;
      }

      match = ( j == qlen );
    }

    if ( match ) {
      this.setMatchData(query, queryId, match, locations);
    }

    return match;
  }

  setMatchData(query, queryId, bool, locations) {
    let score = this.calcLocationScore(locations);
    let selectionCount = this.previousSelectionCount(query, queryId);
    switch ( true ) {
      case ( selectionCount > 1 && selectionCount < 4 ):
        score = score * selectionCount;
        break;
      case ( selectionCount >= 4 && selectionCount < 6 ):
        score = score * 4;
        break;
      case ( selectionCount >= 6 && selectionCount < 10 ):
        score = score * 5;
        break;
      case ( selectionCount >= 10 ):
        score = score * 6;
        break;
    }

    this.previousMatches[query] = {
      match: bool,
      locations: locations,
      score: score
    };
  }

  calcLocationScore(locations) {
    // Simply double the length of each match length.
    return locations.map((match) => {
      let matchLength = Math.abs(match[0] - match[1]);
      let multiplier = matchLength == 1 ? 1 : 2;

      let startsWithSlash = this.string[match[0]] == '/'
      if ( startsWithSlash && matchLength > 1 ) multiplier += 1;
      return matchLength * multiplier;

    }, this).reduce((a, b) => {
      return a + b;
    }, 0);
  }

  previousSelectionCount(query, queryId) {
    return Selections.getCount(query, queryId);
  }

  hasMatchData(query) {
    return !!this.matchData(query);
  }

  matchData(query) {
    return this.previousMatches[query];
  }

  charAt(i) {
    return this.string.charAt(i);
  }
}

module.exports = Matcher;
