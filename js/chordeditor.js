var scalechords = [];
var chordcomplexity = 3;

var selectedscale = 0;
var chordsroot = "C";
var isPlayingChord = false;

var changingnamechord, hoveredchord, hoveredside, isChordHovered;
var selectedchord = null;

//to select which note was added/removed
var oldpianoselection;

var maxchordspermeasure = 4;


function selectChord(chord){

    if(selectedchord == chord){
        unselectChord();
    }
    else{
        unselectChord();
        selectedchord = chord;
        playChord();
        $('#chordpiano').klavier('setSelectedValues', noteArraytoMidi(sessionchords[chord][0]));
        $("#chord"+(chord+1)).css("background","var(--bright-color)");
    }

    drawRhythm();

}

function playChord(input){

    if(input == null){
        instrmusaepiano.triggerAttackRelease(sessionchords[selectedchord][0], sessionchords[selectedchord][1] * Tone.Time("1m"));
        isPlayingChord = true;
        return;
    }

    anime({
        targets: "#chordbtn"+input,
        translateY: -10,
        duration: 300,
        easing: 'easeOutElastic(1, .8)',
    });
    instrmusaepiano.triggerAttack(scalechords[input],Tone.now());
    isPlayingChord = true;

    $('#chordpiano').klavier('setSelectedValues', noteArraytoMidi(scalechords[input]));

    if(selectedchord != null){
    sessionchords[selectedchord][0] = scalechords[input];
    updateChordsOnScore();
    unselectChord();
    }

}

function releaseChords(input){
    
    anime({
        targets: "#chordbtn"+input,
        translateY: 0,
        duration: 300,
        easing: 'easeOutElastic(1, .8)',
    });
    scalechords.forEach((e)=>instrmusaepiano.triggerRelease(e));
    isPlayingChord = false;
    $('#chordpiano').klavier('setSelectedValues',[]);
}

function getChordsFromScale(){

    scalechords = [];
    for(var x = 0; x < 7; x++){
        var thischord = [];
        thischord.push((scales[selectedscale][0][x]-12));
        for(var y = 0; y < chordcomplexity; y++){
            var noteindex = x + (y*2);
            if(noteindex > (scales[selectedscale][0].length)-1){
                noteindex = noteindex - (scales[selectedscale][0].length-1);
            }
            thischord.push(scales[selectedscale][0][noteindex]);
        }
        scalechords.push(Tone.Frequency(chordsroot+"4").harmonize(thischord));
    }

    scalechords.forEach((e,i)=>{

        var btncontent = "";
        btncontent += chordNotestoName(e);
        $("#chordbtn"+i).html(btncontent);

    });

}

function addChord(chordnotes,chord,side){

    //this inserts a new chord, transforming half of other chord on a NC chord, 
    //on it's left side (side = 0),
    //or on the right (side = 1)
    var olderchord = sessionchords[chord];
    var olderchordrhythm = olderchord[3];

    var halfofrhythm = olderchordrhythm.length/2;
    var rhythm1sthalf = olderchordrhythm.splice(0,halfofrhythm);
    var rhythm2ndhalf = olderchordrhythm.splice(-halfofrhythm);

    if(rhythm1sthalf.length==0)rhythm1sthalf = rhythm2ndhalf;
    if(rhythm2ndhalf.length==0)rhythm2ndhalf = rhythm1sthalf;

    //older chord is smaller than 8th note, do nothing
    if(olderchord[1] <= 1/maxchordspermeasure){return;}
    //left
    if(side == 0){
        //insert the new chord(index on array, [[notes(NC)], duration, measure, rhythmpattern])
        sessionchords.splice(chord+side, 0, [chordnotes, olderchord[1]/2, olderchord[2], rhythm1sthalf]);
        olderchord[3] = rhythm2ndhalf;
        olderchord[1] = sessionchords[chord][1];
    }
    //right
    if(side == 1){
        sessionchords.splice(chord+side, 0, [chordnotes, olderchord[1]/2, olderchord[2], rhythm2ndhalf]);
        olderchord[3] = rhythm1sthalf;
        olderchord[1] = sessionchords[chord][1]/2;

    }
    
    var chorddiv = '<div class="chord" id="chord' + (chord+side) + '">' +
                //'<div class="addchordbar acbl"></div>' +
                '<span class="material-icons addchordbtn acbl">add_circle</span>' +
                chordNotestoName(chordnotes) + 
                //'<div class="addchordbar acbr"></div>' +
                '<span class="material-icons addchordbtn acbr">add_circle</span>' +
                '</div>';
    
    $("#measure" + olderchord[2]).append(chorddiv);
    updateChordsOnScore();
    unselectChord();
}

function removeChord(){
    var chordsinthismeasure = sessionchords.filter(function(value, index, arr){ 
        return value[2] == sessionchords[selectedchord][2];
    });
    var siblingchordsnum = chordsinthismeasure.length;
    var chordindexinmeasure = chordsinthismeasure.indexOf(sessionchords[selectedchord])

    if(siblingchordsnum == 1){
        sessionchords[selectedchord][0] = [];
    }  
    else if(siblingchordsnum > 1){
        if(chordindexinmeasure == 0){
            sessionchords[selectedchord+1][1] += sessionchords[selectedchord][1];
            sessionchords[selectedchord+1][3] = sessionchords[selectedchord][3].concat(sessionchords[selectedchord+1][3]);
        }
        else{
            sessionchords[selectedchord-1][1] += sessionchords[selectedchord][1];
            sessionchords[selectedchord-1][3] = sessionchords[selectedchord-1][3].concat(sessionchords[selectedchord][3]);

        }

        sessionchords = sessionchords.filter(function(value, index, arr){ 
            return index != selectedchord;
        });
        
        $("#chord"+(selectedchord+1)).remove();    
    }

    unselectChord();
    updateChordsOnScore();

}

function updateChordsOnScore(){

    sessionchords.forEach((e,i)=>{

        $("#chord"+(i+1)).html(chordNotestoName(e[0]));
        if(chordNotestoName(e[0]) == "N.C"){
            $("#chord"+(i+1)).addClass("nochord");
        }
        else{
            $("#chord"+(i+1)).removeClass("nochord");
        }
        $(".chord").toArray().forEach((e,i)=>{
            $(e).attr("id","chord"+(i+1));
        });

        $("#chord"+(i+1)).width(sessionchords[i][1] * 100 + "%");

    });

    //update droppable to include new chords

    $(".chord").droppable({
        accept:".chordbtn",
        hoverClass: ".drop-hover",
        over: function( event, ui ) {
  
          hoveredchord = event.target.id.replace("chord","");
          isChordHovered = true;
          //$("#chord"+hoveredchord).width($("#chord"+hoveredchord).width()-10);
        },
        out: function( event, ui ) {
          //$("#chord"+hoveredchord).css("outline","");
          //hoveredchord = hoveredside = null;
        },
        drop: function( event, ui ) {
          var chordnum = $(ui.draggable).attr("id").replace("chordbtn","");
          addChord(scalechords[chordnum],hoveredchord-1,hoveredside);
        }
    });

    drawRhythm();
    drawChordsCircle();


    
}

function unselectChord(){
    selectedchord = null;
    $(".chord").css("background","var(--brightest-color)");
    $('#chordpiano').klavier('setSelectedValues', []);

}   

////////////////////////////////
//RHYTHM EDITOR
////////////////////////////////

function drawRhythm(){

    $(".re-chord").remove();

    if (selectedchord == null)return;

    var measuretodraw = sessionchords[selectedchord][2];
    var measurechords = sessionchords.filter(chord => chord[2] == measuretodraw);
    
    measurechords.forEach((chord,chordindex)=>{
        var rechordcont = '<div class="re-chord" id="re-chord'+chordindex+'" style="width:'+chord[1]*100+'%"></div>'
        var rechordlbl = 
        '<a class="re-chordlbl">'+
        '<span class="material-icons" onclick="editRhythm('+chordindex+',false)">remove_circle</span>'+
        '<span>'+chordNotestoName(chord[0])+'</span>'+
        '<span class="material-icons" onclick="editRhythm('+chordindex+',true)">add_circle</span>'+
        '</a>';

        $("#rhythmeditor").append(rechordcont);
        $("#re-chord"+chordindex).append(rechordlbl);

        chord[3].forEach((strike,strikeindex)=>{

            var chordstrikeind = '<div class="re-strike" id="re-strike-'+chordindex+'-'+strikeindex+'"></div>';
            $("#re-chord"+chordindex).append(chordstrikeind);

            if(strike==0){
                $("#re-strike-"+chordindex+"-"+strikeindex).addClass("re-silence");
            }
        })
    })
}

function editRhythm(chord,add_delete){

    var measure = sessionchords[selectedchord][2];
    var chordindexes = [];
    sessionchords.forEach((e,i)=>{if(e[2]==measure)chordindexes.push(i)});

    if(add_delete){
        sessionchords[chordindexes[chord]][3].push(2)

    }else{
        sessionchords[chordindexes[chord]][3].pop()

    }
    drawRhythm()

}




////////////////////////////////
//BOTTOM PIANO
////////////////////////////////

function setNotes(input){
    sessionchords[selectedchord][0] = midiArraytoNote(input);
    updateChordsOnScore();
}




////////////////////////////////
//EVENTS
////////////////////////////////

$(document).on("click",".chord",function(e){
    var chordclicked = e.target.id.replace("chord","")-1;
    selectChord(chordclicked);
});

$(document).on("dblclick",".chord",function(e){

    changingnamechord = $(e.target).attr("id").replace("chord","")-1;
    $(e.target).html("");
    $("#floatinginput").val("");
    $("#floatinginput").css({
        top: $(e.target).offset().top,
        left: $(e.target).offset().left,
        width:  $(e.target).width(),
    });
    $("#floatinginput").select();
    $("#floatinginput").removeClass("hidden").addClass("visible");

});


$("#floatinginput").blur(function(e){

    $("#chord"+(changingnamechord+1)).html(chordNotestoName(sessionchords[changingnamechord][0]));
    $("#floatinginput").removeClass("visible").addClass("hidden").css({top: "-999px" ,left:"-999px"});;
    changingnamechord = null;

});

$("#floatinginput").change(function(e){

    sessionchords[changingnamechord][0] = chordNametoNotes($("#floatinginput").val());
    $("#chord"+(changingnamechord+1)).html(chordNotestoName(sessionchords[changingnamechord][0]));
    $("#floatinginput").removeClass("visible").addClass("hidden").css({top: "-999px" ,left:"-999px"});;
    changingnamechord = null;

});

$("html").keydown(function (e) {
    //ONLY TRIGGER WHEN PAGE LOADED
    if(appMode == 3){
      //1-9
      if (e.keyCode >= 49 && e.keyCode <= 57 && isPlayingChord == false && changingnamechord == null) {
        playChord(e.keyCode - 49);
      }
      if(e.keyCode == 8){
          removeChord();
      }

    }
});

$("html").keyup(function (e) {
    //ONLY TRIGGER WHEN PAGE LOADED
    if(appMode == 3){
      //1-9
      if (e.keyCode >= 49 && e.keyCode <= 57 && isPlayingChord == true) {
        releaseChords(e.keyCode - 49);
      }
    }
});

$(".chordbtn").mousedown(function (e) {
  //ONLY TRIGGER WHEN PAGE LOADED

  playChord($(e.target).attr("id").replace("chordbtn",""));
  
});

$(".chordbtn").mouseup(function (e) { 
    releaseChords($(e.target).attr("id").replace("chordbtn",""));
});

$(".chordbtn").mouseout(function (e) { 
    if(isPlayingChord == true){
    releaseChords($(e.target).attr("id").replace("chordbtn",""));
    }  
});

$('#chordpiano').click((e)=>{
    var notepressed = $(e.target).data("value");;
    var pianonotes = $('#chordpiano').klavier('getSelectedValues');

    if(pianonotes.indexOf(notepressed)!=-1){
        instrmusaepiano.triggerAttackRelease(Tone.Frequency(notepressed,"midi"),"4n")
    }

    setNotes($('#chordpiano').klavier('getSelectedValues'));
});

$(".chordbtn").draggable({
    revert: true,
    revertDuration:0,
    helper:"clone",
    opacity: 0.35,
    cursorAt: { bottom: 27 },
    classes: {
        "ui-draggable-dragging":"draghelper",
    },
    drag: function( event, ui ) {

        if(isChordHovered){
        var innerposition = ui.offset.left-$("#chord"+hoveredchord).offset().left;
        hoveredside = (innerposition<($("#chord"+hoveredchord).width()/2)-27)?(0):(1);

        if($("#chord"+hoveredchord).parent().children().length < maxchordspermeasure){
            $("#addchordhelper").appendTo("#chord"+hoveredchord);
            $("#addchordhelper").width($("#chord"+hoveredchord).width()/2);
        }

    
        if(hoveredside == 0){
            $("#addchordhelper").css("left",0)
        }
        if(hoveredside == 1){
            $("#addchordhelper").css("left",$("#chord"+hoveredchord).width()/2);
        }
    }
        
    },
    stop: function( event, ui ) {

    }
});
