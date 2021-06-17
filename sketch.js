var mode = 'play'; //either 'play' or 'build'

//'play' mode
var ball;
var pegArray = [];
var ppr = 8; //pegs per row

var currentPegIdx = -1; //keeps track of which peg is moving

var scores = []; 
var currentScore = []; //an array of notes being played while the ball is falling
var currentTimes = []; //an array of times between each note while the ball is falling

var lastTime; //the last time a note was played
var minTime = 100; //the minimum amount of time between notes (prevents too many repeated notes)

var numOfPegs = 128; // max number of pegs (never actually reaches this point)
var dorianScale = [62, 64, 65, 67, 69, 71, 72, 74]; //D dorian/C scale starting on D
var colours = ['darkred','orange','yellow','green','blue','indigo','violet','red']; //svg colour names 

//'build' mode
var song = []; //the scores on the build board
var root; //existing node on build board
var nodes = [];

var tempScore = null; //the score being copied on to the main board
var currentScoreIdx = -1;
var currentNodeIdx = -1;

//for dragged events
var prevX;
var prevY;

//for clicked events
var pressedX;
var pressedY;

function setup() {
  createCanvas(windowWidth,windowHeight);
  noStroke();

  ball = new Ball(mouseX);
  lastTime = millis();

  for(var i = 0; i<numOfPegs; i++) { 
    if(-150 + int(i/ppr)*100 > height + 150) break; //stops pegs from being spawned past the canvas size (including rotation)

    var index = int(random(0,dorianScale.length-1)) //picks a random note from scale

    var midi = dorianScale[index]; //picks a random note from scale
    var c = color(colours[index]); //picks the corresponding colour

    //creates pegs and offsets each row
    if(int(i/ppr)%2 == 0) pegArray[i] = new Peg(100 + (i%ppr)*100, -150 + int(i/ppr)*100, midi, c);
    else pegArray[i] = new Peg(50 + (i%ppr)*100, -150 + int(i/ppr)*100, midi, c);

    console.log(i);
  }  

  root = new Node(null, null);
  nodes.push(root); 
}

function draw() {
  if(mode == 'play') drawPlay();
  else if(mode == 'build') drawBuild();

  //for dragged events
  prevX = mouseX;
  prevY = mouseY;
}

function drawPlay() {
  background(0);

  var split = width*(2/3); //split between pegs and scores

  //checks each peg to see it the ball has collided with it
  //adds the note of the peg to currentScore
  for(var i = 0; i<pegArray.length; i++) { 
    pegArray[i].display();

    if(!ball.falling) continue;
    if(pegArray[i].checkCollision(ball)) {
      if(millis() - lastTime > minTime && ball.falling) {
        currentScore.push(pegArray[i].m);
        currentTimes.push(millis());
      }
      lastTime = millis();
    }
  }

  //adding to score once ball has reached the bottom
  if(!ball.falling && currentScore.length > 0) {
    var temp = new Score();

    for(var i = 0; i<currentScore.length; i++) {
      temp.notes.push(currentScore[i]);
      temp.times.push(currentTimes[i]);
    }
    scores.push(temp); //ball has reached bottom and is added to record of scores
    currentScore.length = 0; //clears currentScore
    currentTimes.length = 0; 
  } 

  //ball
  ball.move();
  ball.display();

  //score collection board
  fill(0);
  rect(split-1, 0, 2, height);
  fill(255);
  rect(split, 0, width/3, height); 

  //displaying scores on the board
  for(var i = 0; i<scores.length; i++) {
    scores[i].display(split, (scores.length-1-i)*scores[i].height);
  }

  //check key for rotation
  checkKeys();
}

function drawBuild() {
  background(255);
  var split = width/3; //split between score collection and building board

  //displaying collection of scores on the board
  for(var i = 0; i<scores.length; i++) {
    scores[i].display(0, (scores.length-1-i)*scores[i].height);
  }

  //building song building board
  fill(0);
  rect(split-1, 0, 2, height);
  fill(255);
  rect(split, 0, width*(2/3), height); 

  //song display (the scores on the build board)
  for(var i = 0; i<song.length; i++) {
    song[i].display(song[i].x, song[i].y);
  }

  //nodes display 
  for(var i = 0; i<nodes.length; i++) {
    nodes[i].display();
  }

  //temp score display (the score currently being copied to the build board)
  if(tempScore != null) tempScore.display(tempScore.x, tempScore.y);
}

function mouseMoved() {
  // player chooses where the ball drops
  if(!ball.falling) {
    ball.x = mouseX;
  }
}

function mouseReleased() {
  // user drops ball
  if(!ball.falling && ball.isOn(mouseX, mouseY) && mouseX < width*(2/3)) {
    ball.falling = true;
  }

  // user drops the temp score on to the build board
  if(tempScore != null) {
    if(tempScore.x > width/3) {
      var temp = new Score();

      temp.notes = tempScore.notes;
      temp.times = tempScore.times;
      temp.x = tempScore.x;
      temp.y = tempScore.y;

      song.push(temp);

      nodes.push(new Node(song[song.length-1], null));
    }
    tempScore = null;
    
  } 

  //if the end of a node is on top of a score, make that node the 'next' of the current node
  for(var i = 0; i<nodes.length; i++) { //the node with connection (current node)
    var found = false;
    for(var j = 0; j<nodes.length; j++) { //receiving node
      if(i == j) continue;
      if(nodes[j].isOn(nodes[i].endX , nodes[i].endY )) {
        nodes[i].next = nodes[j];
        found = true;
        break;
      }
    }
    if(!found) nodes[i].next = null;
  }
  
}

function mouseClicked() {
  //specifies a click as an event where the press and release were within 5 pixels
  var x2 = (mouseX-pressedX)*(mouseX-pressedX);
  var y2 = (mouseY-pressedY)*(mouseY-pressedY);
  var c = Math.sqrt(x2 + y2);

  if(c > 5) return;

  //plays a scores
  for(var i = 0; i<scores.length; i++) {
    if(scores[i].isOnPlay(mouseX, mouseY)) scores[i].playScore();
  }

  if(mode == 'build') {
    //plays a score on the build board
    for(var i = 0; i<song.length; i++) {
      if(song[i].isOnPlay(mouseX, mouseY)) song[i].playScore();
    }
    
    //plays a node (and all 'next' nodes)
    for(var i = 0; i<nodes.length; i++) {
      if(nodes[i].isOn(mouseX, mouseY)) nodes[i].playNode(); 
    }
  }
}

function mousePressed() {
  pressedX = mouseX;
  pressedY = mouseY;

  if(mode == 'play') { //play
    //selects a peg to move, assigns index to currentPegIdx
    for(var i = 0; i<pegArray.length; i++) {
      if(pegArray[i].isOn(mouseX, mouseY)) {
        currentPegIdx = i;
        return;
      }
    }
    currentPegIdx = -1;
  }
  else if(mode == 'build') { //build
    //selects a score to move to build board
    for(var i = 0; i<scores.length; i++) {
      if(scores[i].isOn(mouseX, mouseY)) {
        tempScore = new Score();

        tempScore.notes = scores[i].notes;
        tempScore.times = scores[i].times;
        tempScore.x = scores[i].x;
        tempScore.y = scores[i].y;

        break;
      }
    }

    //selects a node to connect, assigns it to currentNodeIdx
    var found = false;
    for(var i = 0; i<nodes.length; i++) {
      if(nodes[i].isOn(mouseX, mouseY)) {
        currentNodeIdx = i;
        found = true;
        break;
      }
    }
    if(!found) currentNodeIdx = -1;

    //selects a score on the build board to move, assigns it to currentScoreIdx
    for(var i = 0; i<song.length; i++) {
      if(song[i].isOn(mouseX, mouseY)) {
        currentScoreIdx = i;
        return;
      }
    }
    currentScoreIdx = -1;
  }

  
}

function mouseDragged() {

  //play
  //moves the currently selected peg
  if(currentPegIdx != -1) {
    var xDist = mouseX - prevX; 
    var yDist = mouseY - prevY;
    pegArray[currentPegIdx].updatePos(pegArray[currentPegIdx].x + xDist, pegArray[currentPegIdx].y + yDist);
  }

  //build
  if(mode == 'build') {
    //moves the score being copied to the build board
    if(tempScore != null) {
      var xDist = mouseX - prevX; 
      var yDist = mouseY - prevY;
      tempScore.updatePos(tempScore.x + xDist, tempScore.y + yDist);
    }
    
    //moves the selected score on the build board (also moves the associated node)
    if(currentScoreIdx != -1) {
      var xDist = mouseX - prevX; 
      var yDist = mouseY - prevY;
      song[currentScoreIdx].updatePos(song[currentScoreIdx].x + xDist, song[currentScoreIdx].y + yDist);
    }
    
    //moves the end point of the selected node
    if(currentNodeIdx != -1) {
      nodes[currentNodeIdx].endX = mouseX;
      nodes[currentNodeIdx].endY = mouseY;
    }
  }

  prevX = mouseX;
  prevY = mouseY;
}

function keyPressed() {
  // switches between modes
  if (keyCode == TAB) {
    if(mode == 'play') mode = 'build';
    else mode = 'play';
  } 
}

function checkKeys() {
  //rotates pegs around the point (width/3, height/2) using LEFT/RIGHT arrow keys
  angleMode(DEGREES);
  if (keyIsDown(LEFT_ARROW)) {
    for(var i = 0; i<pegArray.length; i++) {
      var x = ((pegArray[i].x - width/3)*cos(-1)) - ((pegArray[i].y - height/2)*sin(-1)) + width/3;
      var y = ((pegArray[i].x - width/3)*sin(-1)) + ((pegArray[i].y - height/2)*cos(-1)) + height/2;
      pegArray[i].updatePos(x, y);
    }
  } else if (keyIsDown(RIGHT_ARROW)) {
    for(var i = 0; i<pegArray.length; i++) {
      var x = ((pegArray[i].x - width/3)*cos(1)) - ((pegArray[i].y - height/2)*sin(1)) + width/3;
      var y = ((pegArray[i].x - width/3)*sin(1)) + ((pegArray[i].y - height/2)*cos(1)) + height/2;
      pegArray[i].updatePos(x, y);
    }
  }

}

class Ball{
  constructor(xval) {
    this.rad = 20;
    this.x = xval;
    this.y = this.rad; 
    this.xVel = 0;
    this.yVel = 0; 
    this.xAccel = 0; 
    this.yAccel = 1; // "gravity" increasing in downward direction

    this.falling = false;
  }

  move() {
    if(this.falling) {
      // move the ball
      this.x += this.xVel;
      this.y += this.yVel; 
      this.xVel += this.xAccel; 
      this.yVel += this.yAccel;
  
      // bounce off sides
      if(this.x-this.rad < 0 || this.x+this.rad > width*(2/3)) {
        this.xVel = -this.xVel;
      }
    } 
    
    // reset ball
    if(this.y > height) {
      this.x = mouseX;
      this.y = this.rad; 
      this.xVel = 0;
      this.yVel = 0;
      this.falling = false;
    }
  }

  display() {
    fill(255,0,0);
    ellipse(this.x,this.y,this.rad*2);
  }

  //returns true is the mouse is on the ball
  isOn(xval, yval) { 
    var x2 = (this.x-xval)*(this.x-xval);
    var y2 = (this.y-yval)*(this.y-yval);
    var c = Math.sqrt(x2 + y2);

    if(c <= this.rad) return true;
    else return false;
  }
}

class Peg {
  constructor(xval, yval, midi, colour) {
    this.rad = 10; 
    this.x = xval;
    this.y = yval;
    this.m = midi;
    this.freq = midiToFreq(midi);
    //this.collided = false;

    this.c = colour;

    //Set up signal chain (Osc => env)
    this.decay = 0.0;
    this.env = new p5.Envelope(0.01, this.decay, 0.0, 0.0);
    
    this.osc = new p5.Oscillator(this.freq); //440, Sine by default
    this.osc.amp(this.env);
    this.osc.start();
  }

  display() {
    //if(this.collided) return;
 
    noStroke();

    //outline
    fill(this.c);
    ellipse(this.x,this.y,this.rad*2);
    //middle
    fill(255);
    ellipse(this.x,this.y,(this.rad-2)*2);
  }

  updatePos(x, y) {
    this.x = x; 
    this.y = y;
  }

  checkCollision(ball) {
    //calculate distance between peg and ball
    var xDist = ball.x - this.x;
    var yDist = ball.y - this.y;
    var dist = Math.sqrt( (xDist*xDist) + (yDist*yDist) );

    if(dist < ball.rad + this.rad) { //has collided
      ball.xVel = xDist*0.2; 
      ball.yVel = yDist*0.2;

      // stops ball from infinitely bouncing on same peg
      while (ball.xVel == 0) {
        ball.xVel = random(-0.5, 0.5);
      }

      //play sound
      this.env.play(); //trigger sound
      return true;
    }
    return false;
  }

  //returns true is mouse is on the peg
  isOn(xval, yval) {
    var x2 = (this.x-xval)*(this.x-xval);
    var y2 = (this.y-yval)*(this.y-yval);
    var c = Math.sqrt(x2 + y2);

    if(c <= this.rad) return true;
    else return false;
  }
}

class Score {
  constructor() {
    this.notes = []; //array of midi notes
    this.times = []; //array of time between notes
    this.y = 0;
    this.x = width*(2/3);
    this.height = 70;
    this.width = width/3;
    this.noteSize = this.height/6;

    //play button
    this.playSize = 20;
    this.playX = this.x + 10; 
    this.playY = this.y + this.height/2 - this.playSize/2;

    this.noteDist = this.noteSize/2; //distance of a 2nd between notes
    //how many "noteDist"s each note is from the anchoring C
    this.noteRef = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; //C, C#, D, D#, E, F, F#, G, G#, A, A#, B
    
    var c5 = 2.5*this.noteSize; //where c5 is in relation to yval in display
    var octave = 3.5*this.noteSize; //the distance of an octave in pixels
    //where each C is in relation to yval in display
    this.cRef = [c5+(octave*4), c5+(octave*3), c5+(octave*2), c5+(octave), c5, c5-(octave), c5-(octave*2), c5-(octave*3)];//c1, c2, c3, c4, c5, c6, c7, c8 
    this.midiRef = [24, 36, 48, 60, 72, 84, 96, 108]; //corresponding Cs in midi

    //Set up signal chain (Osc => env)
    this.decay = 0.0;
    this.env = new p5.Envelope(0.01, this.decay, 0.0, 0.0);
    
    this.osc = new p5.Oscillator(); //440, Sine by default
    this.osc.amp(this.env);
    this.osc.start();

    this.playing = false;
    this.ps; //the polysynth (plays the chords)

    //possible chords
    this.C = ['C3','G4','E5','B5'];
    this.D = ['D4','A4','C5','F5'];
    this.E = ['E4','B4','D5','G5'];
    this.F = ['F3','E4','A4','C5'];
    this.G = ['G3','F4','B4','D5'];
    this.A = ['A3','G4','C5','E5'];
  }

  display(xval, yval) {
    //updates position
    this.x = xval;
    this.y = yval;

    //updates play button positions
    this.playX = this.x + 10; 
    this.playY = this.y + this.height/2 - this.playSize/2;

    //displays note heads
    var x = this.x + 20 + this.playSize;
    for(var i = 0; i<this.notes.length; i++) {
      fill(0);
      noStroke();

      //distance between notes determined by time between them
      var timeDiff = 0;
      if(i != 0) timeDiff = this.times[i] - this.times[i-1];
      x += timeDiff*0.1;

      //1. figure out which octave you're in
      //2. figure out how many "noteDist"s you are from the closest C, rounding down
      var y = yval;
      var idx = 0;

      for(var j = 1; j<this.midiRef.length; j++) { //finds the octave/anchoring C
        if(this.midiRef[j] > this.notes[i]) {
          y += this.cRef[j-1];
          idx = j-1;
          break;
        }
      }

      y -= this.noteRef[int(this.notes[i]-this.midiRef[idx])] * this.noteDist; 

      ellipse(x, y, this.noteSize+2, this.noteSize);
    }

    //staff lines
    for(var i = 0; i<5; i++) {
      strokeWeight(1);
      stroke(0);
      line(this.x, yval + this.noteSize + i*this.noteSize, this.x + this.width, yval + this.noteSize + i*this.noteSize);
    }
     
    //play button
    noStroke();
    fill(color('magenta'));
    rect(this.playX, this.playY, this.playSize, this.playSize);
    fill(255);
    triangle(this.playX + 2, this.playY + 2, this.playX + this.playSize - 2, this.playY + this.playSize/2, this.playX + 2, this.playY + this.playSize - 2);

    // disposes of the polysynth if not playing to free up memory
    if(this.playing = false) this.ps.dispose();
  }

  updatePos(xval, yval) {
    this.x = xval; 
    this.y = yval;

    this.playX = this.x + 10; 
    this.playY = this.y + this.height/2 - this.playSize/2;
  }

  //returns true if mouse is on the score (for moving)
  isOn(xval, yval) {
    if(xval > this.x && xval < this.x + this.width && yval > this.y && yval < this.y+this.height) return true;
    return false;
  }

  //returns true if mosue is on the play button
  isOnPlay(xval, yval) {
    if(xval > this.playX && xval < this.playX + this.playSize && yval > this.playY && yval < this.playY+this.playSize) return true;
    return false;
  }

  playScore() {
    this.ps = new p5.PolySynth(); //create a polysynth

    this.playing = true;

    let dur = 0.5; // note duration (in seconds)
    let vel = 0.1; // velocity (volume, from 0 to 1)

    var repeatStart = false; //is true when i is on the first note of a string of repeated notes


    for(var i = 0; i<this.notes.length; i++) {
      //waits in between playing notes
      if(i != 0) {
        var stop = millis() + this.times[i]-this.times[i-1];
        while(millis() < stop) {
          var useless = 0;
        }
      }

      //plays the midi note at i
      this.osc.freq(midiToFreq(this.notes[i]));
      this.env.play(); 

      //checks if i is the beginning of a string of repeated notes      
      if(this.notes[i] == this.notes[i+1] && this.notes[i] != this.notes[i-1]) repeatStart = true;
      else repeatStart = false;

      //plays a chord if i is at the beginning, beginning of repeated notes, or end
      if(i == 0 || repeatStart || i == this.notes.length-1) {    
        if(this.notes[i] == 62 || this.notes[i] == 74 ) { //D
          for(var j = 0; j<this.D.length; j++) this.ps.play(this.D[j], vel, 0, dur);
        }
        else if(this.notes[i] == 64) { //E
          for(var j = 0; j<this.C.length; j++) this.ps.play(this.C[j], vel, 0, dur);
        }
        else if(this.notes[i] == 65) { //F
          for(var j = 0; j<this.F.length; j++) this.ps.play(this.F[j], vel, 0, dur);
        }
        else if(this.notes[i] == 67) { //G
          for(var j = 0; j<this.C.length; j++) this.ps.play(this.C[j], vel, 0, dur);
        }
        else if(this.notes[i] == 69) { //A
          for(var j = 0; j<this.F.length; j++) this.ps.play(this.F[j], vel, 0, dur);
        }
        else if(this.notes[i] == 71) { //B
          for(var j = 0; j<this.C.length; j++) this.ps.play(this.C[j], vel, 0, dur);
        }
        else if(this.notes[i] == 72) { //C
          for(var j = 0; j<this.C.length; j++) this.ps.play(this.C[j], vel, 0, dur);
        }
      }
      
    }
    
    this.playing = false;
  }
}

class Node {
  constructor(score, next) {
    this.score = score;
    this.next = next; //the score to be played after this one

    //connects x coordinate to score
    this.x;
    if(this.score == null) this.x = width/3; 
    else this.x = this.score.x+this.score.width;

    //connects y coordinate to score
    this.y;
    if(this.score == null) this.y = 0; 
    else this.y = this.score.y+(this.score.height/2);

    this.height = 20; 
    this.width = 20;

    this.endX = this.x;
    this.endY = this.y;
  }

  playNode() {
    //play this.score, then wait a little bit before playing the node at this.next
    if(this.score != null) this.score.playScore();
    var waitTime = millis() + 500; 
    while(millis() < waitTime) var useless = 'too';
    if(this.next != null) this.next.playNode();
  }

  display(){
    //updates position of node based on this.score's position
    if(this.score == null) this.x = width/3; 
    else this.x = this.score.x+this.score.width;

    if(this.score == null) this.y = 0; 
    else this.y = this.score.y+(this.score.height/2);

    //the node play box
    noStroke();
    fill(color('aqua')); 
    rect(this.x, this.y, this.width, this.height);

    //the node connection line
    stroke(color('aqua')); 
    strokeWeight(2);
    line(this.x+(this.width/2), this.y+(this.height/2), this.endX, this.endY);
  }

  //returns true if the mouse is on the node box
  isOn(xval, yval) {
    if(xval > this.x && xval < this.x + this.width && yval > this.y && yval < this.y+this.height) return true;
    return false;
  }
}