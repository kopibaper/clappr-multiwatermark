//conf
var reportUrl = "http://tracker.p2p.8686c.com/report";
var cdcUrl = "http://transit1.wslog.chinanetcenter.com/message/queue/msg_push_binary?topic=wsrtcdata&msg_key=";
var cdcUrlBk = "http://transit2.wslog.chinanetcenter.com/message/queue/msg_push_binary?topic=wsrtcdata&msg_key=";
var cdcDisable = 0;
var reportIntervalTime = 60000;
var eventIntervalTime = 10000;
var reportDisable = 0;
var confIntervalTime = 60000;
var confTimeout = 8000;
var reportTimeout = 8000;

var confInterval = undefined;

function ConfStart() {
    ConfGet("http://www.vod.lxdns.com/p2p/webrtc/bjweimiao/wsrtcConf.json");
    !confInterval && (confInterval = setInterval(ConfGet, confIntervalTime));
}

function ConfStop() {
    confInterval && (clearInterval(confInterval), confInterval = undefined);
}

function ConfGet(url) {
    $.ajax({
        type: "get",
        url: url,
        dataType: "json",
        success: onConfRespone,
        async: true,
        crossDomain: true,
        timeout: confTimeout
    });
}

function onConfRespone(res) {
    res.commonConf.disable_cdc_log != undefined ? cdcDisable = res.commonConf.disable_cdc_log : 0;
    res.commonConf.report_url != undefined ? reportUrl = res.commonConf.report_url : 0;
    res.commonConf.p2pdatabox_url != undefined ? cdcUrl = res.commonConf.p2pdatabox_url : 0;
    res.commonConf.p2pdatabox_urlbk != undefined ? cdcUrlBk = res.commonConf.p2pdatabox_urlbk : 0;
    res.commonConf.disable_portal_log_report != undefined ? reportDisable = res.commonConf.disable_portal_log_report : 0;
    res.commonConf.conf_timeout != undefined ? confTimeout = res.commonConf.conf_timeout : 0;
    res.commonConf.http_log_timetout != undefined ? reportTimeout = res.commonConf.http_log_timetout : 0;

    if (res.commonConf.update_conf_interval != undefined) {
        if (confIntervalTime != res.commonConf.update_conf_interval * 1000) {
            confIntervalTime = res.commonConf.update_conf_interval * 1000;
            ConfStop();
            confInterval = setInterval(ConfGet, confIntervalTime);
        }
    }

    if (res.commonConf.periodic_log_interval != undefined) {
        if (reportIntervalTime != res.commonConf.periodic_log_interval * 1000) {
            reportIntervalTime = res.commonConf.periodic_log_interval * 1000;
            reportInterval && (clearInterval(reportInterval));
            startTime && (reportInterval = setInterval(ReportInterval, reportIntervalTime));
        }
    }

    if (res.commonConf.event_log_interval != undefined) {
        if (eventIntervalTime != res.commonConf.event_log_interval * 1000) {
            eventIntervalTime = res.commonConf.event_log_interval * 1000;
            reportEvent && (clearInterval(reportEvent));
            startTime && (reportEvent = setInterval(ReportEvent, eventIntervalTime));
        }
    }
}

//report
var reportInterval = undefined;
var reportEvent = undefined;
var reportIntervalValue = new Object;
var reportIntervalRtcTmp = new Object;
var reportEventValue = undefined;
var streamUrl = undefined;
var startTime = undefined;
var playerId = undefined;
var mediaEle = undefined;
var firstShowTime = undefined;
var sysInfo = undefined;
var waitCheck = undefined;
var waitCheckLastTime = undefined;
var waitStatus = 0;

function ReportStart(url, media) {
    ReportIntervalInit();
    reportIntervalValue.render_times = 1;
    mediaEle = media;
    !startTime && mediaEle && (mediaEle.addEventListener("loadedmetadata", onMediaLoadedMetadata));

    var time = (Date.now()).toFixed(0);
    var timeHex = Number(time).toString(16);
    playerId = sha256_digest(timeHex + performance.now() + Math.random() + url);
    streamUrl = url;
    startTime = Date.now().toFixed(0);
    sysInfo = getEnv().browser;

    ReportIntervalRtcInit();
    reportEventValue = new Object;

    !reportInterval && (reportInterval = setInterval(ReportInterval, reportIntervalTime));
    !reportEvent && (reportEvent = setInterval(ReportEvent, eventIntervalTime));
}

function ReportStop() {
    waitCheck && (clearInterval(waitCheck), waitCheck = undefined, waitCheckLastTime = undefined, waitStatus = 0);
    reportInterval && (clearInterval(reportInterval), reportInterval = undefined);
    reportEvent && (clearInterval(reportEvent), reportEvent = undefined);
    ReportInterval();
    ReportEvent();
    streamUrl = undefined;
    startTime = undefined;
    playerId = undefined;
    firstShowTime = undefined;
    sysInfo = undefined;

    mediaEle && (mediaEle.removeEventListener("loadedmetadata", onMediaLoadedMetadata));
    mediaEle = undefined;
}

function onMediaLoadedMetadata() {
    firstShowTime = Date.now().toFixed(0) - startTime;
    reportIntervalValue.first_show_time = firstShowTime;
    !waitCheck && (waitCheck = setInterval(waitingCheck, 400), waitCheckLastTime = mediaEle.currentTime, waitStatus = 0);
}

function waitingCheck() {
    if (!firstShowTime || !mediaEle) {
        return;
    }

    var now = mediaEle.currentTime;
    if (waitCheckLastTime >= now) {
        if (0 == waitStatus) {
            reportIntervalValue.buffer_times += 1;
            waitStatus = 1;
        }
    } else {
        waitStatus = 0;
    }
    waitCheckLastTime = now;
}

function ReportIntervalRtcInit() {
    reportIntervalRtcTmp.delay_time = 0;
    reportIntervalRtcTmp.video_recv_bytes = 0;
    reportIntervalRtcTmp.audio_recv_bytes = 0;
    reportIntervalRtcTmp.video_read_num = 0;
    reportIntervalRtcTmp.audio_read_num = 0;
    reportIntervalRtcTmp.video_first_pkt_delay = 0;
    reportIntervalRtcTmp.video_first_frame_delay = 0;
    reportIntervalRtcTmp.video_jitter_delay = 0;
    reportIntervalRtcTmp.video_frame_received = 0;
    reportIntervalRtcTmp.video_frame_decoded = 0;
    reportIntervalRtcTmp.video_frame_droped = 0;
    reportIntervalRtcTmp.video_render_drop = 0;
    reportIntervalRtcTmp.audio_first_pkt_delay = 0;
    reportIntervalRtcTmp.audio_delay_time = 0;
    reportIntervalRtcTmp.audio_lost = 0;
    reportIntervalRtcTmp.video_lost = 0;

    reportIntervalRtcTmp.audio_jitter_delay_cnt = 0;
    reportIntervalRtcTmp.audio_delay_cnt = 0;
    reportIntervalRtcTmp.video_jitter_delay_cnt = 0;
    reportIntervalRtcTmp.delay_cnt = 0;
}

function ReportIntervalInit() {
    reportIntervalValue.first_show_time = 0;
    reportIntervalValue.sdp_conn_times = 0;
    reportIntervalValue.sdp_fail = 0;
    reportIntervalValue.connect_succ = 0;
    reportIntervalValue.connect_times = 0;
    reportIntervalValue.buffer_times = 0;
    reportIntervalValue.delay_time = 0;
    reportIntervalValue.video_recv_bytes = 0;
    reportIntervalValue.audio_recv_bytes = 0;
    reportIntervalValue.video_read_num = 0;
    reportIntervalValue.audio_read_num = 0;
    reportIntervalValue.render_times = 0;
    reportIntervalValue.video_first_pkt_delay = 0;
    reportIntervalValue.video_first_frame_delay = 0;
    reportIntervalValue.video_jitter_delay = 0;
    reportIntervalValue.video_frame_received = 0;
    reportIntervalValue.video_frame_decoded = 0;
    reportIntervalValue.video_frame_droped = 0;
    reportIntervalValue.video_render_drop = 0;
    reportIntervalValue.audio_first_pkt_delay = 0;
    reportIntervalValue.audio_delay_time = 0;
    reportIntervalValue.audio_jitter_delay = 0;
    reportIntervalValue.audio_lost = 0;
    reportIntervalValue.video_lost = 0;
}

function ReportInterval() {
    reportIntervalValue.audio_jitter_delay =
        reportIntervalRtcTmp.audio_jitter_delay_cnt > 0 ?
        (reportIntervalValue.audio_jitter_delay / reportIntervalRtcTmp.audio_jitter_delay_cnt).toFixed(0) :
        reportIntervalValue.audio_jitter_delay;
    reportIntervalValue.audio_delay_time =
        reportIntervalRtcTmp.audio_delay_cnt > 0 ?
        (reportIntervalValue.audio_delay_time / reportIntervalRtcTmp.audio_delay_cnt).toFixed(0) :
        reportIntervalValue.audio_delay_time;
    reportIntervalValue.video_jitter_delay =
        reportIntervalRtcTmp.video_jitter_delay_cnt > 0 ?
        (reportIntervalValue.video_jitter_delay / reportIntervalRtcTmp.video_jitter_delay_cnt).toFixed(0) :
        reportIntervalValue.video_jitter_delay;
    reportIntervalValue.delay_time =
        reportIntervalRtcTmp.delay_cnt > 0 ?
        (reportIntervalValue.delay_time / reportIntervalRtcTmp.delay_cnt).toFixed(0) :
        reportIntervalValue.delay_time;

    if (!reportDisable) {
        var root = new Object;
        var item = new Object;
        ReportCommon(root);
        ReportIntervalFormat(reportIntervalValue, item);
        root["events"] = new Array;
        root["events"].push(item);
        var reportStr = JSON.stringify(root);

        $.ajax({
            url: reportUrl,
            type: "post",
            data: ReportEncry(reportStr),
            processData: false,
            contentType: false,
            timeout: reportTimeout,
            async: true,
            crossDomain: true,
            error: function() {
                setTimeout(function() {
                    $.ajax({
                        url: reportUrl,
                        type: "post",
                        data: ReportEncry(reportStr),
                        processData: false,
                        contentType: false,
                        timeout: reportTimeout,
                        async: true,
                        crossDomain: true
                    });
                }, 1000);
            }
        });
    }

    if (!cdcDisable) {
        var cdcStr = ReportCdc(reportIntervalValue);
        var num1 = Math.round(Date.now() * (Math.random() + Math.random()) / 1000).toString(16), num2 = Math.round(performance.now()).toString(16);
		var num3 = Math.round(performance.now() * Math.random() * Math.random() * 1000).toString(16), num4 = Math.round((Date.now() / 1000 + performance.now()) * Math.random()).toString(16);
		var msgKey = md5(num1 + '-' + num2 + '-' + num3 + '-' + num4 + Date.now());

        $.ajax({
            url: cdcUrl + msgKey,
            type: "post",
            data: ReportEncry(cdcStr),
            processData: false,
            contentType: false,
            timeout: reportTimeout,
            async: true,
            crossDomain: true,
            error: function() {
                setTimeout(function() {
                    $.ajax({
                        url: cdcUrlBk + msgKey,
                        type: "post",
                        data: ReportEncry(cdcStr),
                        processData: false,
                        contentType: false,
                        timeout: reportTimeout,
                        async: true,
                        crossDomain: true
                    });
                }, 1000);
            }
        });
    }

    ReportIntervalInit();
    reportIntervalRtcTmp.audio_jitter_delay_cnt = 0;
    reportIntervalRtcTmp.audio_delay_cnt = 0;
    reportIntervalRtcTmp.video_jitter_delay_cnt = 0;
    reportIntervalRtcTmp.delay_cnt = 0;
}

function ReportEncry() {
    if (arguments.length < 1) {
        return;
    }

    var key = "wsPFVLive";
    var string = arguments[0];
    var len = string.length;
    var array = new Uint8Array(len);
    var content = "";
    for (var i = 0; i < len; ++i) {
        array[i] = string.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        content += String.fromCharCode(array[i]);
    }
    array = null;
    
    return content;
}

function ReportCommon() {
    if (arguments.length < 1) {
        return;
    }

    var item = arguments[0];
    item["eventCommon"] = new Object;
    item["eventCommon"]["Time"] = (Date.now() / 1000).toFixed(0);
    item["eventCommon"]["sType"] = "rtc_player";
    item["eventCommon"]["ver"] = "v.3.0.1_h";
    item["eventCommon"]["cid"] = "bjweimiao";
    item["eventCommon"]["did"] = playerId;
    item["eventCommon"]["pTime"] = Date.now().toFixed(0) - startTime;
    item["eventCommon"]["sysinfo"] = sysInfo;
    item["eventCommon"]["platform"] = "h5_rtc";
}

function PORTAL_VALID_STR() {
    return arguments[0] ? arguments[0] : "-";
}

function ReportGetDomain() {
    if (!arguments[0]) {
        return "-";
    }

    var url = arguments[0];
    var pos = url.indexOf("://");
    pos = -1 == pos ? 0 : pos + 3;
    var pos2 = url.indexOf("/", pos);

    return -1 == pos2 ? url.substr(pos) : url.substr(pos, pos2 - pos);
}

function ReportCdc() {
    if (arguments.length < 1) {
        return;
    }

    var obj = arguments[0];
    var str;
  
    str = (Date.now() / 1000).toFixed(0) + "\t";  // p2p_event_time , å•ä½s
    str += "bjweimiao\t";  // customerID
    str += PORTAL_VALID_STR(playerId) + "\t";      // playerID
    str += PORTAL_VALID_STR(playerId) + "\t";    // devID
    str += "h5\t";                                   // platform
    str += "rtc_player\t";        // service_type
    str += "v.3.0.1_h\t";                               // version
    str += (Date.now().toFixed(0) - startTime) + "\t";     // playTime,ms
    str += PORTAL_VALID_STR(streamUrl) + "\t";            // source_url
    str += ReportGetDomain(streamUrl) + "\t";               // cdn_domain
    str += obj.first_show_time + "\t";  // first_show_time,ms
    str += obj.sdp_fail + "\t";  // sdp_fail
    str += obj.sdp_conn_times + "\t";  // sdp_conn_times
    str += obj.connect_succ + "\t";  // connect_succ
    str += obj.connect_times + "\t";  // connect_times
    str += obj.buffer_times + "\t";  // buffer_times
    str += obj.delay_time + "\t";    // video_delay
    str += obj.audio_delay_time + "\t";    // audio_delay
    str += obj.video_recv_bytes + "\t";  // video_recv_bytes
    str += obj.audio_recv_bytes + "\t";  // audio_recv_bytes
    str += obj.render_times + "\t";  //èµ·æ’­æ¬¡æ•° render_times
    str += obj.video_first_pkt_delay + "\t";  //è§†é¢‘é¦–ä¸ªrtpåŒ…æ—¶é—´
    str += obj.audio_first_pkt_delay + "\t";  //éŸ³é¢‘é¢‘é¦–ä¸ªrtpåŒ…æ—¶é—´
    str += obj.video_first_frame_delay + "\t";  //è§†é¢‘é¦–å¸§æ—¶é—´
    str += obj.video_jitter_delay + "\t";  //è§†é¢‘ jitteræ—¶å»¶
    str += obj.audio_jitter_delay;  //éŸ³é¢‘ jitteræ—¶å»¶
  
    return str;
}

function ReportIntervalFormat() {
    if (arguments.length < 2) {
        return;
    }

    var obj = arguments[0];
    var item = arguments[1];
    for (key in obj) {
        if (key != "audio_lost" && key != "video_lost") {
            item[key] = obj[key];
        }
    }
  
    item["audio_lost"] = new Object;
    item["audio_lost"]["L0"] = obj.audio_lost;
    item["audio_lost"]["L1"] = 0;
    item["audio_lost"]["L2"] = 0;
    item["audio_lost"]["L3"] = 0;
    item["audio_lost"]["L4"] = 0;
  
    item["video_lost"] = new Object;
    item["video_lost"]["L0"] = obj.video_lost;
    item["video_lost"]["L1"] = 0;
    item["video_lost"]["L2"] = 0;
    item["video_lost"]["L3"] = 0;
    item["video_lost"]["L4"] = 0;

    item["eventTime"] = (Date.now() / 1000).toFixed(0);
    item["ws0017"] = "play_interval";
    item["url"] = streamUrl;
    item["playerId"] = playerId;
}

function ReportEvent(type) {
    if (reportDisable || Object.keys(reportEventValue).length <= 0) {
        return;
    }

    var root = new Object;
    root["events"] = new Array;
    ReportCommon(root);

    var pos = streamUrl.indexOf("?");
    for (key in reportEventValue) {
        var event = new Object;
        event["event_time_msec"] = key;
        event["ws0017"] = 1 == reportEventValue[key] ? "open" : "close";
        event["url"] = -1 == pos ? streamUrl : streamUrl.substr(0, pos);
        event["player_id"] = PORTAL_VALID_STR(playerId);
        root["events"].push(event);
    }

    var reportStr = JSON.stringify(root);

    $.ajax({
        url: reportUrl,
        type: "post",
        data: ReportEncry(reportStr),
        processData: false,
        contentType: false,
        timeout: reportTimeout,
        async: true,
        crossDomain: true,
        error: function() {
            setTimeout(function() {
                $.ajax({
                    url: reportUrl,
                    type: "post",
                    data: ReportEncry(reportStr),
                    processData: false,
                    contentType: false,
                    timeout: reportTimeout,
                    async: true,
                    crossDomain: true
                });
            }, 1000);
        }
    });

    reportEventValue = undefined;
    reportEventValue = new Object;
}

function ReportEventAdd(type) {
    var keyTime = Date.now().toFixed(0);
    if (1 == type) {
        reportEventValue[keyTime] = 1;
    } else if (2 == type) {
        reportEventValue[keyTime] = 2;
    }
}

function ReportIntervalAdd(type) {
    switch (type) {
        case 1:
            reportIntervalValue.sdp_conn_times += 1;
            break;
        case 2:
            reportIntervalValue.sdp_fail += 1;
            break;
        case 3:
            reportIntervalValue.connect_times += 1;
            break;
        case 4:
            reportIntervalValue.connect_succ += 1;
            break;
    }
}

function ReportIntervalRtc() {
    if (arguments.length <= 0) {
        return;
    }
    var report = arguments[0];
    if (report.kind == "audio") {
        reportIntervalValue.audio_recv_bytes += report.bytesReceived - reportIntervalRtcTmp.audio_recv_bytes;
        reportIntervalRtcTmp.audio_recv_bytes = report.bytesReceived;
        reportIntervalValue.audio_lost += report.packetsLost - reportIntervalRtcTmp.audio_lost;
        reportIntervalRtcTmp.audio_lost = report.packetsLost;
    } else if (report.kind == "video") {
        reportIntervalValue.video_recv_bytes += report.bytesReceived - reportIntervalRtcTmp.video_recv_bytes;
        reportIntervalRtcTmp.video_recv_bytes = report.bytesReceived;
        reportIntervalValue.video_frame_received += report.framesReceived - reportIntervalRtcTmp.video_frame_received;
        reportIntervalRtcTmp.video_frame_received = report.framesReceived;
        reportIntervalValue.video_frame_decoded += report.framesDecoded - reportIntervalRtcTmp.video_frame_decoded;
        reportIntervalRtcTmp.video_frame_decoded = report.framesDecoded;
        reportIntervalValue.video_frame_droped += report.framesDropped - reportIntervalRtcTmp.video_frame_droped;
        reportIntervalRtcTmp.video_frame_droped = report.framesDropped;
        reportIntervalValue.video_lost += report.packetsLost - reportIntervalRtcTmp.video_lost;
        reportIntervalRtcTmp.video_lost = report.packetsLost;
    }
}

function ReportIntervalRtcStats() {
    if (arguments.length <= 0) {
        return;
    }

    var report = arguments[0];
    if (report.stat("mediaType") == "audio") {
        reportIntervalValue.audio_jitter_delay += parseInt(report.stat("googJitterBufferMs"));
        reportIntervalRtcTmp.audio_jitter_delay_cnt += 1;
        reportIntervalValue.audio_delay_time += parseInt(report.stat("googCurrentDelayMs"));
        reportIntervalRtcTmp.audio_delay_cnt += 1;
    } else if (report.stat("mediaType") == "video") {
        reportIntervalValue.video_jitter_delay += parseInt(report.stat("googJitterBufferMs"));
        reportIntervalRtcTmp.video_jitter_delay_cnt += 1;
        reportIntervalValue.delay_time += parseInt(report.stat("googTargetDelayMs"));
        reportIntervalRtcTmp.delay_cnt += 1;
    }
}