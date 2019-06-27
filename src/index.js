'use strict';

const Alexa = require('alexa-sdk');
const Speech = require('ssml-builder');
var AWS = require('aws-sdk');
var AmazonSpeech = require('ssml-builder/amazon_speech');
var speech = new AmazonSpeech();
const APP_ID = 'amzn1.ask.skill.f07804f2-0d90-456c-8296-04df5931442a';

const newSessionHandlers = {
    'LaunchRequest': function () {
        this.emit("GetQuoteIntent");
    },
    'GetQuoteIntent': function () {
        var sessionAttributes = this.attributes;
        var that = this;
        buildClips(sessionAttributes, function(){
            var fileURL = getRandomQuote(sessionAttributes);
            if(!fileURL){
                that.emit(":tell","Sorry, no quotes");
            }else{
                speech.audio(fileURL);
                that.emit(':tell', speech.ssml(true));
                speech = new AmazonSpeech();
            }
        });
    },
    'GetMultipleQuotesIntent': function(){
        var sessionAttributes = this.attributes;
        var that = this;
        buildClips(sessionAttributes, function(){
            speech.say("Sure.").pause("300ms").say("I will play a few.");
            for(var i in [0, 1, 2, 3]){
                var fileURL = getRandomQuote(sessionAttributes);
                if(!fileURL){
                    that.emit(":tell","Sorry, ran out of quotes");
                }
                speech.audio(fileURL);
                speech.pause('750ms');
            }
            speech.say("Do you want more?");
            that.emit(':ask', speech.ssml(true), "Say 'more quotes' if you want me to keep "+
                "going. Otherwise, say 'stop'");
            speech = new AmazonSpeech();
        });
    },
    'AMAZON.HelpIntent': function () {
        //this.handler.state = GAME_STATES.HELP;
        this.emit(':ask', "need help? say new quote to get a quote. say more quotes to get"+
            " a few quotes. say stop to exit.");
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Goodbye');
    },
    'AMAZON.StopIntent': function () {
        //notify about user setting
        this.emit(':tell', 'Goodbye');
    },
    'AMAZON.NoIntent': function(){
        this.emit(':tell', 'Goodbye');
    },
    'ShouldEndSessionRequest': function(){
        //notify about user setting
        this.emit(":tell","Goodbye");
    },
    'Unhandled': function () {
        this.emit(':ask', "Sorry I can't help you with that. Say new quote to get a quote.", "Unhandled");
    },
};

function buildClips(sessionAttributes, callback){
    if(typeof(sessionAttributes.clipsPlayed)=="undefined"){
        sessionAttributes["clipsPlayed"] = [];
    }
    if(typeof(sessionAttributes.clips)=="undefined"){
        sessionAttributes["clips"] = [];
        assembleAudioFiles(sessionAttributes, function (response) {
            var contentLength = response.length;
            for (var i = 0; i < contentLength; i++) {
                sessionAttributes.clips.push(response[i].Key);
            }
            callback();
        });
    }else{
        callback();
    }
}

function assembleAudioFiles(sessionAttributes, callback) {
    console.log("dumping list");
    AWS.config.update({
        "accessKeyId": "AKIAJ2LX5PS4PMNPG4SQ",
        "secretAccessKey": "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",
        "region": "us-east-1"
    });
    var s3 = new AWS.S3();
    var params = {
        Bucket: "soundsofschrute",
        Delimiter: "/",
        EncodingType: "url"
    };
    s3.listObjects(params, function (err, response) {
        if (err) {
            //callback([])
            console.log("Error uploading data: ", err);
        } else {
            console.log("successfully fetched data");
            
        }
        callback(response.Contents);
    });
}

function getRandomQuote(sessionAttributes){
    var clipsLength = sessionAttributes.clips.length;
    if(clipsLength == 0){ 
        return false;
    }
    var baseUrl = "https://s3.amazonaws.com/soundsofschrute/";
    var randomNum = getRandomNum(clipsLength);
    if(sessionAttributes.clipsPlayed.length == sessionAttributes.clips.length){
        sessionAttributes.clipsPlayed = [];
    }
    while(sessionAttributes.clipsPlayed.indexOf(
            sessionAttributes.clips[randomNum])>=0){
                randomNum = getRandomNum(clipsLength);
            }
    sessionAttributes.clipsPlayed.push(sessionAttributes.clips[randomNum]);
    return baseUrl + sessionAttributes.clips[randomNum];
}

function getRandomNum(limit){
    return Math.floor(Math.random()*(limit));
}

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    //alexa.resources = languageString;
    alexa.registerHandlers(newSessionHandlers);
    alexa.execute();
};