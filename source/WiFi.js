enyo.kind({
	name: "WiFiListItem",
	classes: "group-item",
	layoutKind: "FittableColumnsLayout",
	handlers: {
		onmousedown: "pressed",
		ondragstart: "released",
		onmouseup: "released"
	},
	components:[
		{name: "SSID", content: "SSID", fit: true},
		{name: "Padlock", content: "Secured"},
		{name: "Signal", content: "Signal", style: "margin-left: 8px;"}
	],
	pressed: function() {
		this.addClass("onyx-selected");
	},
	released: function() {
		this.removeClass("onyx-selected");
	}
});

enyo.kind({
	name: "WiFiService",
	kind: "enyo.PalmService",
	service: "palm://com.palm.wifi/"
});

enyo.kind({
	name: "WiFi",
	layoutKind: "FittableRowsLayout",
	phonyFoundNetworks: [
		{
			"networkInfo": {
			"ssid": "BTWiFi",
			"availableSecurityTypes": [
				"none"
			],
			"signalBars": 2,
			"signalLevel": 77,
			"connectState": "ipConfigured"
			}
		},
		{
			"networkInfo": {
			"ssid": "BTWiFi-with-FON",
			"availableSecurityTypes": [
				"none"
			],
			"signalBars": 2,
			"signalLevel": 69
			}
		},
		{
			"networkInfo": {
			"ssid": "SKY13476",
			"availableSecurityTypes": [
				"psk"
			],
			"signalBars": 2,
			"signalLevel": 86
			}
		},
		{
			"networkInfo": {
			"ssid": "BTHub3-8MP5",
			"availableSecurityTypes": [
				"psk"
			],
			"signalBars": 1,
			"signalLevel": 64
			}
		}
	],
	foundNetworks: [],
	events: {
		onActiveChanged: ""
	},
	currentSSID: "",
	palm: false,
	findNetworksRequest: null,
	components: [
		{
			name: "ErrorPopup",
			kind: "onyx.Popup",
			classes: "error-popup",
			modal: true,
			style: "padding: 10px;",
			components: [
				{name: "ErrorMessage", content: "", style: "display: inline;" },
			]
		},
		{kind: "onyx.Toolbar",
		style: "line-height: 28px;",
		components:[
				{content: "Wi-Fi"},
				{name: "WiFiToggle", kind: "onyx.ToggleButton", style: "position: absolute; top: 8px; right: 6px; height: 31px;", onChange: "toggleButtonChanged"}
		]},
		{name: "WiFiPanels",
		kind: "Panels",
		arrangerKind: "HFlipArranger",
		fit: true,
		draggable: false,
		components:[
				{
					name: "WiFiDisabled",
					layoutKind: "FittableRowsLayout",
					style: "padding: 35px 10% 35px 10%;",
					components: [
						{
							style:"padding-bottom: 10px;",
							components: [
								{content: "WiFi is disabled", style: "display: inline; color: white;"},
							]
						}
					]
				},
				{name: "NetworkList",
				layoutKind: "FittableRowsLayout",
				style: "padding: 35px 10% 35px 10%;",
				components:[
					{kind: "onyx.GroupboxHeader", style: "border-radius: 8px 8px 0 0;", content: "Choose a Network"},
					{kind: "Scroller",
					touch: true,
					horizontal: "hidden",
					fit: true,
					style: "border: 1px solid white; border-top: 0; border-radius: 0 0 8px 8px;",
					components:[
						{name: "SearchRepeater",
						kind: "Repeater",
						count: 0,
						onSetupItem: "setupSearchRow",
						components: [
							{kind: "WiFiListItem", ontap: "listItemTapped"}
						]}
					]},
				]},
				{
					name: "NetworkConnect",
					layoutKind: "FittableRowsLayout",
					style: "padding: 35px 10% 35px 10%;",
					components: [
						{style:"padding-bottom: 10px;", components: [
							{content: "Connect to", style: "display: inline; color: white;"},
							{name: "PopupSSID", content: "SSID", style: "margin-left: 4px; display: inline; color: white; font-weight: bold;"},
							{kind: "onyx.GroupboxHeader", style: "margin-top: 10px; border-radius: 8px 8px 0 0;", content: "Password"},
							{kind: "onyx.InputDecorator", style: "display: block; margin-bottom: 16px;", alwaysLooksFocused: true, components:[
								{name: "PasswordInput", placeholder: "Type here ..", kind: "onyx.Input", type: "password", style: "width: 100%"}
							]},
							{kind: "onyx.Button", style: "width: 100%", content: "Connect", ontap: "onNetworkConnect"},
							{kind: "onyx.Button", style: "width: 100%; margin-top: 10px;", content: "Cancel", ontap: "onNetworkConnectAborted"},
						]},
					]
				},
				{ /* Workaround for HFlipArranger incorrectly displaying with 2 panels*/ }
		]},
		{kind: "onyx.Toolbar", components:[
			{name: "Grabber", kind: "onyx.Grabber"},
		]},
		{
			name: "FindNetworks",
			kind: "WiFiService",
			method: "findnetworks",
			subscribe: true,
			resubscribe: true,
			onResponse: "handleFindNetworksResponse"
		},
		{
			name: "GetWiFiStatus",
			kind: "WiFiService",
			method: "getstatus",
			subscribe: true,
			resubscribe: true,
			onResponse: "handleWiFiStatus"
		},
		{
			name: "SetWiFiState",
			kind: "WiFiService",
			method: "setstate"
		},
		{
			name: "Connect",
			kind: "WiFiService",
			method: "connect",
			onResponse: "handleConnectResponse"
		},
		{
			name: "WiFiServiceWatch",
			kind: "enyo.PalmService",
			service: "palm://com.palm.bus/signal",
			method: "registerServerStatus",
			onResponse: "handleWifiServiceStatus",
		}
	],
	//Handlers
	create: function(inSender, inEvent) {
		this.inherited(arguments);

		console.log("WiFi: created");

		if(!window.PalmSystem) {
			// WiFi is enabled by default ...
			this.$.WiFiPanels.setIndex(1);
			// if we're outside the webOS system add some entries for easier testing
			this.foundNetworks = this.phonyFoundNetworks;
			this.$.SearchRepeater.setCount(this.foundNetworks.length);
			return;
		}

		this.$.WiFiServiceWatch.send({"serviceName":"com.palm.wifi"});
		this.palm = true;
	},
	handleWifiServiceStatus: function(inSender, inResponse) {
		var result = inResponse.data;

		if (!result)
			return;

		if (result.connected) {
			this.$.GetWiFiStatus.send({});
			this.$.FindNetworks.send({});
		}
		else {
			this.$.WiFiPanels.setIndex(0);
			this.$.WiFiToggle.setValue(false);
		}
	},
	reflow: function(inSender) {
		this.inherited(arguments);
		if(enyo.Panels.isScreenNarrow())
			this.$.Grabber.applyStyle("visibility", "hidden");
		else
			this.$.Grabber.applyStyle("visibility", "visible");
	},
	//Action Handlers
	toggleButtonChanged: function(inSender, inEvent) {
		if(inEvent.value == true)
			this.activateWiFi(this);
		else
			this.deactivateWiFi(this);

		this.doActiveChanged(inEvent);
	},
	listItemTapped: function(inSender, inEvent) {
		this.currentNetwork = {
			ssid: inSender.$.SSID.content,
			securityTypes: inSender.$.Padlock.content
		};
		
		if(inSender.$.Padlock.content != "none" || inSender.$.Padlock.content != "") {
			this.$.PopupSSID.setContent(this.currentNetwork.ssid);
			this.showNetworkConnect();
		}
		else {
			console.log("Connect to open network");
			this.connect(this, {ssid: this.currentNetwork.ssid});
		}
	},
	setupSearchRow: function(inSender, inEvent) {
		inEvent.item.$.wiFiListItem.$.SSID.setContent(this.foundNetworks[inEvent.index].networkInfo.ssid);
		inEvent.item.$.wiFiListItem.$.Padlock.setContent(this.foundNetworks[inEvent.index].networkInfo.availableSecurityTypes);
		inEvent.item.$.wiFiListItem.$.Signal.setContent(this.foundNetworks[inEvent.index].networkInfo.signalBars);
	},
	onNetworkConnect: function(inSender, inEvent) {
		var password = this.$.PasswordInput.getValue();

		if (this.validatePassword(password)) {
			this.connect(this, {ssid: this.currentSSID, password: password});
		}
		else {
			this.showError("Entered password is invalid");
		}

		// switch back to network list view
		this.$.WiFiPanels.setIndex(1);

		delete password;
		this.$.PasswordInput.setValue("");
	},
	onNetworkConnectAborted: function(inSender, inEvent) {
		// switch back to network list view
		this.$.WiFiPanels.setIndex(1);

		this.$.PasswordInput.setValue("");
	},
	//Action Functions
	showNetworkConnect: function(inSender, inEvent) {
		this.$.WiFiPanels.setIndex(2);
	},
	setToggleValue: function(value) {
		this.$.WiFiToggle.setValue(value);
	},
	showError: function(message) {
		this.$.ErrorMessage.setContent(message);
		this.$.ErrorPopup.show();
	},
	activateWiFi: function(inSender, inEvent) {
		if(this.palm) {
			this.$.SetWiFiState.send({"state":"enabled"});
		}
	},
	deactivateWiFi: function(inSender, inEvent) {
		if(this.palm) {
			this.$.SetWiFiState.send({"state":"disabled"});
		}
	},
	connect: function(inSender, inEvent) {
		if(!this.palm)
			return;

		var ssid = this.currentNetwork.ssid;
		var password = inEvent.password;
		var hidden = false;
		
		var obj = {};
		
		if(password != "") {
			enyo.log("Connecting to PSK network");
			obj = {
				"ssid": ssid,
				"security": {
					"securityType": "psk",
					"simpleSecurity": {
						"passKey": password
					}
				}
			};
		}
		/*
			TODO: Enterprise support when it becomes available
		*/
		else {
			enyo.log("Connecting to unsecured network");
			obj = {
				"ssid": ssid
			};
		}
		
		var request = navigator.service.Request("luna://com.palm.wifi/",
		{
			method: 'connect',
			parameters: obj
		});
	},
	//Utility Functions
	clearFoundNetworks: function() {
		this.foundNetworks = [];
		this.$.SearchRepeater.setCount(this.foundNetworks.length);
	},
	validatePassword: function(key) {
		var pass = false;

		if (8 <= key.length && 63 >= key.length) {
				pass = true;
		}

		return pass;
	},
	//Service Callbacks
	handleWiFiStatus: function(inSender, inResponse) {
		var result = inResponse.data;

		if (!result)
			return;

		if(result.status == "serviceDisabled") {
			this.$.WiFiToggle.setValue(false);
			this.$.WiFiPanels.setIndex(0);
			this.clearFoundNetworks();
		}
		else if(result.status == "serviceEnabled") {
			this.$.WiFiToggle.setValue(true);
			this.$.WiFiPanels.setIndex(1);
		}
	},
	handleFindNetworksResponse: function(inSender, inResponse) {
		var result = inResponse.data;
		if (result.foundNetworks) {
			this.foundNetworks = result.foundNetworks;
			this.$.SearchRepeater.setCount(this.foundNetworks.length);
		}
		else {
			this.clearFoundNetworks();
		}
	},
	handleConnectResponse: function(inSender, inResponse) {
		var result = inResponse.data;
	}
});
