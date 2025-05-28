'use strict';
var playBtn = document.getElementById('play');
var stopBtn = document.getElementById('stop');

stopBtn.disabled = true;

playBtn.onclick = play;
stopBtn.onclick = stop;

var pc;
var intervalValue;
var connectedStatus = 0;

function play() {
	var signal_url = document.getElementById('signal_url').value;
	if (signal_url === '') {
		alert("need signal_url");
		document.getElementById('signal_url').focus();
		return;
	}

	ReportStart(signal_url, document.getElementById("video"));
	ReportEventAdd(1);

	var pos = signal_url.indexOf(".sdp");
	if (-1 == pos) {
		pos = signal_url.indexOf("?");
		if (-1 == pos) {
			signal_url += ".sdp";
		} else {
			signal_url = signal_url.substr(0, pos) + ".sdp" + signal_url.substr(pos);
		}
	}

	playBtn.disabled = true;
	stopBtn.disabled = false;

	trace('Start play');

	var offerSdpOption = {
		offerToReceiveAudio: true,
		offerToReceiveVideo: true
	};

	pc = new RTCPeerConnection(null);
	// pc.addTransceiver("audio", {direction: "recvonly"});
    // pc.addTransceiver("video", {direction: "recvonly"});
	pc.onicecandidate = function(e) {
		onIceCandidate(pc, e);
	};
	pc.oniceconnectionstatechange = function(e) {
		onIceStateChange(pc, e);
	};
	pc.onaddstream = gotRemoteStream;

	pc.createOffer(offerSdpOption).then(function(offer) {
	trace("createOffer:\n"+offer.sdp);

	pc.setLocalDescription(offer);
	var version = "v1.0";
	var sessionId = "sessionid_test";
	var url = signal_url; 
	var request = {
		version: version,
		sessionId:  sessionId,
		localSdp: offer
	};

	$.ajax({
		type: "post",
		url: url,
		data: JSON.stringify(request),
		//contentType: "application/json; charset=utf-8",
		dataType: "json",
		success: play_success,
		error: play_fail,
		crossDomain: true
	});

	ReportIntervalAdd(1);

	function play_fail() {
		ReportIntervalAdd(2);
		stop();
	}

	function play_success(data) {		
		if (data.code != 200) {
			trace("play failed, code:" + data.code);
			ReportIntervalAdd(2);
			stop();
			return;
		}

		var remoteSdp = data.remoteSdp;
		trace("receive answer:\n" + remoteSdp.sdp);

		pc.setRemoteDescription(
			new RTCSessionDescription(remoteSdp),
				function() {
					trace("setRemoteDescription success!");
					ReportIntervalAdd(3);
				},
				function(e) {
					trace("setRemoteDescription failed, message:" + e.message);
				}
			);
		}
	}).catch(function(reason) {
		trace('create offer failed, reason:' + reason);
	});
}

function onIceCandidate(pc, event) {
    trace('ICE candidate: \n' + (event.candidate ? event.candidate.candidate : '(null)'));
}

function onIceStateChange(pc, event) {
    if (pc) {
		if (0 == connectedStatus && pc.iceConnectionState == 'connected') {
			connectedStatus = 1;
			ReportIntervalAdd(4);
			!intervalValue && (intervalValue = setInterval(getStats, 2000));
		} else if (pc.iceConnectionState == 'disconnected') {
            stop();
        }
        trace('ICE state: ' + pc.iceConnectionState);
        trace('ICE state change event: ', event);
    }
}

function getStats() {
	if (pc) {
		// pc.getStats().then(onStats);
		// pc.getStats(onStatsRes);
	}
}

function onStatsRes(res) {
	res.result().forEach(function(report) {
		if (report.type == "ssrc") {
			ReportIntervalRtcStats(report);
		}
	})	
}

function onStats(res) {
	res.forEach(function(report) {
		if (report.type === 'inbound-rtp') {
			ReportIntervalRtc(report);
		}
	});
}

function gotRemoteStream(e) {
    var remoteVideo = document.getElementById('video');
    remoteVideo.srcObject = e.stream;
    trace('Received remote stream');
}

function stop() {
    trace('Stop play');

	intervalValue && (clearInterval(intervalValue), intervalValue = undefined);

    pc.close();
    pc = null;

	ReportEventAdd(2);
	ReportStop();
	connectedStatus = 0;

    stopBtn.disabled = true;
    playBtn.disabled = false;

	// setTimeout(play, 1000);
}

function createVConsole() {
  var scriptEle = document.createElement("script");
  scriptEle.src = './js/vconsole.min.js';
  document.body.appendChild(scriptEle)
  scriptEle.onload = function(){
      window.vConsole = new VConsole();
  }
};


// ConfStart();
play();