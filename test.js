// JavaScript source code
var ffi = require('ffi');
var Struct = require('ref-struct');
var ref = require('ref');

var kCFStringEncodingUTF8 = 0x08000100;

var	coreFoundationDir = 'C:\\Program Files (x86)\\Common Files\\Apple\\Apple Application Support\\',
	mobileDeviceDir = 'C:\\Program Files (x86)\\Common Files\\Apple\\Mobile Device Support\\';

process.env.PATH = coreFoundationDir + ";" + process.env.PATH;
process.env.PATH += ';' + mobileDeviceDir;

var coreFoundation = ffi.Library(coreFoundationDir + 'CoreFoundation.dll', {
	'CFStringGetTypeID': ['ulong', []],
	'CFDictionaryGetTypeID' : ['ulong', []],
	'CFStringCreateWithCString': ['pointer', ['pointer', 'string', 'int']],
	'CFStringGetLength' : ['ulong', ['pointer']],
	'CFRunLoopRun' : ['int', []],
	'CFRunLoopTimerCreate' : ['pointer', ['pointer', 'double', 'double', 'uint', 'uint', 'pointer','pointer']],
	'CFRunLoopStop' : ['void', ['pointer']],
	'CFRunLoopGetCurrent' : ['pointer', []],
	'CFAbsoluteTimeGetCurrent' : ['double', []],
	'CFRunLoopAddTimer' : ['void', ['pointer', 'pointer', 'pointer']],
	'CFRunLoopRemoveTimer' : ['void', ['pointer', 'pointer', 'pointer']],
});

var mobileDevice = ffi.Library(mobileDeviceDir + 'MobileDevice.dll', {
	'AMDeviceLookupApplications' : ['uint', ['pointer', 'uint', 'pointer']],
	'AMDeviceConnect' : ['uint', ['pointer']],
	'AMDeviceNotificationSubscribe' : ['uint', ['pointer', 'uint', 'uint', 'uint', 'pointer']],
});

var ADNCI_MSG_CONNECTED = 1;
var ADNCI_MSG_DISCONNECTED = 2;
var ADNCI_MSG_UNKNOWN = 3;

var _device = null;
var kCFRunLoopCommonModes = coreFoundation.dll.get("kCFRunLoopCommonModes");

function deviceNotification(info, user) {

	console.log("in devicenotification");

	 var info = info.contents
     if(info.msg == ADNCI_MSG_CONNECTED) {
       _device = info.dev;
       coreFoundation.CFRunLoopStop(coreFoundation.CFRunLoopGetCurrent());
     }
     else if(info.msg == ADNCI_MSG_DISCONNECTED) {
     	_device = null;
     }
     else if(info.msg == ADNCI_MSG_UNKNOWN) {
     	// # This happens as we're closing.
     }
     else {
     	throw 'Unexpected device notification status: ' + info.msg; 
     }
}

function timer(timer, info) {
	coreFoundation.CFRunLoopStop(coreFoundation.CFRunLoopGetCurrent());
}

var am_device_notification_callback = ffi.Callback('void', ['pointer', 'int'], deviceNotification);
var cf_run_loop_timer_callback = ffi.Callback('void', ['pointer', 'pointer'], timer);
var am_device_install_application_callback = ffi.Callback('void', ['uint', 'pointer', 'pointer'], function() {

});

var am_device_notification = Struct({
	unknown0: ref.types.uint32,
	unknown1: ref.types.uint32,
	unknown2: ref.types.uint32,
	callback: ref.refType(ref.types.void),
	cookie: ref.types.uint32
});

var am_device_notification_callback_info = Struct({
	  dev: ref.refType(ref.types.void),
   	  msg: ref.types.uint,
      subscription: ref.refType(am_device_notification),
});


function connect() {
	var e = AMDeviceConnect(_device);
	if(e != 0)
		throw e;
}

function waitForDevice(timeout) {
	var e = mobileDevice.AMDeviceNotificationSubscribe(am_device_notification_callback, 0, 0, 0, ref.address(ref.alloc("void")));
	if(e != 0)
		throw e;

	if(timeout > 0) {
		var timer = coreFoundation.CFRunLoopTimerCreate(null, coreFoundation.CFAbsoluteTimeGetCurrent() + timeout, 0, 0, 0, cf_run_loop_timer_callback, null);
		coreFoundation.CFRunLoopAddTimer(coreFoundation.CFRunLoopGetCurrent(), timer, kCFRunLoopCommonModes);
	}

	coreFoundation.CFRunLoopRun();

	if(timeout > 0) {
		coreFoundation.CFRunLoopRemoveTimer(coreFoundation.CFRunLoopGetCurrent(), timer, kCFRunLoopCommonModes);
	}
}

waitForDevice();
connect();

