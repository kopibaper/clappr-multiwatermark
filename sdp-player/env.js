  //æ£€æµ‹æµè§ˆå™¨ç‰ˆæœ¬
  function getBrowserVersion() {
    var agent = navigator.userAgent.toLowerCase();
    var arr = [];
    var Browser = "";
    var Bversion = "";
    var verinNum = "";
    //IE
    if (agent.indexOf("msie") > 0) {
      var regStr_ie = /msie [\d.]+;/gi;
      Browser = "IE";
      Bversion = "" + agent.match(regStr_ie)
    }
    //firefox
    else if (agent.indexOf("firefox") > 0) {
      var regStr_ff = /firefox\/[\d.]+/gi;
      Browser = "firefox";
      Bversion = "" + agent.match(regStr_ff);
    }
    //Chrome
    else if (agent.indexOf("chrome") > 0) {
      var regStr_chrome = /chrome\/[\d.]+/gi;
      Browser = "chrome";
      Bversion = "" + agent.match(regStr_chrome);
    }
    //Safari
    else if (agent.indexOf("safari") > 0 && agent.indexOf("chrome") < 0) {
      var regStr_saf = /version\/[\d.]+/gi;
      Browser = "safari";
      Bversion = "" + agent.match(regStr_saf);
    }
    //Opera
    else if (agent.indexOf("opera") >= 0) {
      var regStr_opera = /version\/[\d.]+/gi;
      Browser = "opera";
      Bversion = "" + agent.match(regStr_opera);
    } else {
      var browser = navigator.appName;
      if (browser == "Netscape") {
        var version = agent.split(";");
        var trim_Version = version[7].replace(/[ ]/g, "");
        var rvStr = trim_Version.match(/[\d\.]/g).toString();
        var rv = rvStr.replace(/[,]/g, "");
        Bversion = rv;
        Browser = "IE"
      }
    }
    verinNum = (Bversion + "").replace(/[^0-9.]/ig, "");
    arr.push(Browser);
    arr.push(verinNum);
    return arr;
  }
  
  //æ£€æµ‹æ˜¯å¦æ˜¯XXæµè§ˆå™¨
  function WB() {
    var UserAgent = navigator.userAgent.toLowerCase();
    return {
      isIE6: /msie 6.0/.test(UserAgent), // IE6
      isIE7: /msie 7.0/.test(UserAgent), // IE7
      isIE8: /msie 8.0/.test(UserAgent), // IE8
      isIE9: /msie 9.0/.test(UserAgent), // IE9
      isIE10: /msie 10.0/.test(UserAgent), // IE10
      isIE11: /msie 11.0/.test(UserAgent), // IE11
      isLB: /lbbrowser/.test(UserAgent), //çŒŽè±¹æµè§ˆå™¨
      isUc: /ucweb/.test(UserAgent) || / ubrowser/.test(UserAgent), // UCæµè§ˆå™¨
      is360: /360se/.test(UserAgent), // 360æµè§ˆå™¨
      isBaidu: /bidubrowser/.test(UserAgent) || /baidubrowser/.test(UserAgent), // ç™¾åº¦æµè§ˆå™¨
      isSougou: /metasr/.test(UserAgent), //æœç‹—æµè§ˆå™¨
      isChrome: /chrome/.test(UserAgent.substr(-33, 6)) || /chrome/.test(UserAgent.substr(-34, 6)), //Chromeæµè§ˆå™¨
      isFirefox: /firefox/.test(UserAgent), //ç«ç‹æµè§ˆå™¨
      isOpera: /opera/.test(UserAgent), // Operaæµè§ˆå™¨
      isSafire: /safari/.test(UserAgent) && !/chrome/.test(UserAgent), // safireæµè§ˆå™¨
      isQQ: /qqbrowser/.test(UserAgent)//qqæµè§ˆå™¨
    };
  }
  
  //æ£€æµ‹å½“å‰æ“ä½œç³»ç»Ÿ
  function CurrentSystem() {
    var system = {
      win: false,
      mac: false,
      xll: false,
      iphone: false,
      ipod: false,
      ipad: false,
      ios: false,
      android: false,
      nokiaN: false,
      winMobile: false,
      wii: false,
      ps: false
    };
    var ua = navigator.userAgent;
    // æ£€æµ‹å¹³å°
    var p = navigator.platform;
    system.win = p.indexOf('Win') == 0;
    system.mac = p.indexOf('Mac') == 0;
    system.xll = (p.indexOf('Xll') == 0 || p.indexOf('Linux') == 0);
    // æ£€æµ‹Windowsæ“ä½œç³»ç»Ÿ
    if (system.win) {
      if (/Win(?:dows )?([^do]{2})\s?(\d+\.\d+)?/.test(ua)) {
        if (RegExp['$1'] == 'NT') {
          switch (RegExp['$2']) {
            case '5.0':
              system.win = '2000';
              break;
            case '5.1':
              system.win = 'XP';
              break;
            case '6.0':
              system.win = 'Vista';
              break;
            case '6.1':
              system.win = '7';
              break;
            case '6.2':
              system.win = '8';
              break;
			case '10.0':
			  system.win = '10';
			  break;
            default:
              system.win = 'NT';
              break;
          }
        } else if (RegExp['$1'] == '9x') {
          system.win = 'ME';
        } else {
          system.win = RegExp['$1'];
        }
      }
    }
    //ç§»åŠ¨è®¾å¤‡
    system.iphone = ua.indexOf('iPhone') > -1;
    system.ipod = ua.indexOf('iPod') > -1;
    system.ipad = ua.indexOf('iPad') > -1;
    system.nokiaN = ua.indexOf('nokiaN') > -1;
    // windows mobile
    if (system.win == 'CE') {
      system.winMobile = system.win;
    } else if (system.win == 'Ph') {
      if (/Windows Phone OS (\d+.\d)/i.test(ua)) {
        system.win = 'Phone';
        system.winMobile = parseFloat(RegExp['$1']);
      }
    }
    //æ£€æµ‹IOSç‰ˆæœ¬
    if (system.mac && ua.indexOf('Mobile') > -1) {
      if (/CPU (?:iPhone )?OS (\d+_\d+)/i.test(ua)) {
        system.ios = parseFloat(RegExp['$1'].replace('_', '.'));
      } else {
        system.ios = 2;    // ä¸èƒ½çœŸæ­£æ£€æµ‹å‡ºæ¥ï¼Œæ‰€ä»¥åªèƒ½çŒœæµ‹
      }
    }
    //æ£€æµ‹Androidç‰ˆæœ¬
    if (/Android (\d+\.\d+)/i.test(ua) || /android (\d+\.\d+)/i.test(ua)) {
      system.android = parseFloat(RegExp['$1']);
    }
    //æ¸¸æˆç³»ç»Ÿ
    system.wii = ua.indexOf('Wii') > -1;
    system.ps = /PlayStation/i.test(ua);
    return system;
  }

function getEnv() {
	let version = getBrowserVersion();
	let browser = WB();
	let sys = CurrentSystem();

	//brower
	let browserRet = 'browser ';
	if (browser.isChrome) {
		browserRet += "Chrome";
	} else if (browser.isFirefox) {
		browserRet += "Firefox";
	} else if (browser.isOpera) {
		browserRet += "Opera";
	} else if (browser.isSafire) {
		browserRet += "Safire";
	} else if (browser.isUc) {
		browserRet += "UC";
	} else if (browser.is360) {
		browserRet += "360";
	} else if (browser.isQQ) {
		browserRet += "QQ";
	} else if (browser.isBaidu) {
		browserRet += "Baidu";
	} else if (browser.isSougou) {
		browserRet += "Sougou";
	} else if (browser.isLB) {
		browserRet += "LieBao";
	} else if (browser.isIE11) {
		browserRet += "IE11";
	} else if (browser.isIE10) {
		browserRet += "IE10";
	} else if (browser.isIE9) {
		browserRet += "IE9";
	} else if (browser.isIE8) {
		browserRet += "IE8";
	} else if (browser.isIE7) {
		browserRet += "IE7";
	} else if (browser.isIE6) {
		browserRet += "IE6";
	} else {
		browserRet += "unknow";
	}
	browserRet += ", core " + version[0] + " " + version[1];

	//sys
	let sysRet = '';
	if (sys.win != false) {
		sysRet = "Win " + sys.win;
	} else if (sys.mac != false) {
		sysRet = "Mac";
	} else if (sys.iphone != false) {
		sysRet = "iPhone";
	} else if (sys.android != false) {
		sysRet = "Android";
	} else if (sys.xll != false) {
		sysRet = "Linux";
	} else if (sys.ipod != false) {
		sysRet = "iPod";
	} else if (sys.ipad != false) {
		sysRet = "iPad";
	} else if (sys.ios != false) {
		sysRet = "ios " + sys.ios;
	} else if (sys.nokiaN != false) {
		sysRet = "nokiaN";
	} else if (sys.winMobile != false) {
		sysRet = "win Mobile";
	} else if (sys.wii != false) {
		sysRet = "Wii";
	} else if (sys.ps != false) {
		sysRet = "Play Station";
	} else {
		sysRet = "unknow sys";
	}
	
	return {'browser' : browserRet, 'sys' : sysRet};
}
