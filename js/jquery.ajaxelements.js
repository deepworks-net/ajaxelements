/**

	Will Document This At Some Point
	
	This lib depends on JQuery and JQuery plugin factory.
	
*/
;(function ( $ ) {

	
	$.plugin('ElementX', {
		defaults: {
			e: undefined
		},
		framework: {
			_execute: function(options) { },
			_run: function(options) {
				this._execute(options);
			},
			_onEvent: function(e) {
				if (this.preventDefault) {
					e.preventDefault();
				}
				this._run();
			}
		},
		methods: {
			fire: function(options) {
				this.config._run.apply(this.config, arguments);
			}
		},
		builder: {
			metadataFn: function() {
				return { "e": this.$elem.attr('data-event') };
			},
			initFn: function() {
				this.config.elem = this.elem;
				this.config.$elem = this.$elem;
				if(this.config.e) {
					var data = this;
					this.$elem.on(this.config.e, function(e){
						data.config._onEvent(e);
					});
				};
				return this;
			}
		}
	});
	
	/**
		Make so can trigger numerous elements, with different events?
		If no target, have a default class for the target?
	*/
	$.plugin('TriggerElement', {
		defaults: {
			autoTrigger: true,
			triggerOnce: false,
			target: undefined,
			triggerEvent: undefined,
			triggerFunc: function() {}
		},
		framework: {
			_triggered: false,
			_execute: function(options) {
				if (!this._triggered || !this.triggerOnce) {
					this._trigger(options);
					this._triggered = true;
				}
			},
			_trigger: function(options) {
				if (this.autoTrigger && this.target && this.triggerEvent) {
					$(this.target).trigger(this.triggerEvent);
				}
				/* Should this be moved up? */
				this.triggerFunc();
			}
		},
		builder: {
			metadataFn: function() {
				return {
					"autoTrigger": $.toBoolUn(this.$elem.attr('data-auto-trigger')),
					"triggerOnce": $.toBoolUn(this.$elem.attr('data-trigger-once')),
					"target": this.$elem.attr('data-target'),
					"triggerEvent": this.$elem.attr('data-trigger-event')
				};
			},
		}
	}, 'ElementX');
	
	$.plugin('TriggerButton', {
		defaults: {
			e: 'click'
		}
	}, 'TriggerElement');
	
	$.plugin('AjaxElement', {
		defaults: {
			ajaxcall: undefined,
			rid: undefined,
			useReplace: false,
			eventStart: 'ajaxStart.AE',
			eventStop: 'ajaxStop.AE',
			triggerEvents: true,
			preventDefault: false,
			blockID: undefined,
			successFunc: function(success) {},
			errorFunc: function(error) {
				alert('There was an Error processing your request, please try again later.');
			},
			unAuthFunc: function(error) {
				alert('There was an Error processing your request, please try again later. UNAUTHORIZED');
			},
			blockFunc: function() {},
			unblockFunc: function() {},
			beginFunc: function(result,success) {},
			endFunc: function(result,success) {},
			preStartFunc: function() {},
			alwaysFunc: function() {},
			replaceFunc: function(result,success) {
				if (this.$rid) {
					if (this.useReplace){
						this.$rid.empty();
						this.$rid.append($.trim(result));
					} else {
						this.$rid.html($.trim(result));
					}
				}
			},
			doneCallbacks: [],
			alwaysCallbacks: [],
			failCallbacks: []
		},
		framework: {
			_buildEvent: function () {
				if (this.triggerEvents) {
					$.event.trigger(this.eventStart);
				}
			},
			_ajaxFunc: function(options) {
				this._buildEvent();
				return $.ajax($.extend({},this.ajaxcall,options));
			},
			_execute: function(ajaxcall,done,fail,always) {
				var api = this;
				this.blockFunc();
				this.preStartFunc();
				this._ajaxFunc(ajaxcall).done(function(result,status,success){
					api.beginFunc(result,success);
					api.replaceFunc(result,success);
					api.endFunc(result,success);
					api.successFunc(success);
				}, this.doneCallbacks, done).fail(function(error){
					if (error.status === 401) {
						api.unAuthFunc(error);
					} else {
						api.errorFunc(error);
					}
				}, this.failCallbacks, fail).always(function(){
					if (api.triggerEvents) {
						$.event.trigger(api.eventStart);
					}
					api.alwaysFunc();
					api.unblockFunc();
				}, this.alwaysCallbacks, always);
			}
		},
		builder: {
			metadataFn: function() {
				var elem = this.$elem;
				var toteURL = elem.attr('data-url');
				var metadata = $.extend({ }, elem.attr('data-ajaxelement'), {
					rid: elem.attr('data-rid'),
					eventStart: elem.attr('data-event-start'),
					eventStop: elem.attr('data-event-stop'),
					eventSpace: elem.attr('data-event-space'),
					triggerEvents: $.toBoolUn(elem.attr('data-trigger-events')),
					useReplace: $.toBoolUn(elem.attr('data-replace')),
					blockID: elem.attr('data-blockID')
				});
				metadata.ajaxcall = $.extend({ }, elem.attr('data-ajaxcall'), { 
					url: toteURL
				});
				metadata.ajaxcall.data = $.extend({ }, elem.attr('data-ajaxdata'), $.parseParams(toteURL));
				return metadata;
			},
			initFn: function() {
				if (this.config.rid) {
					this.config.$rid = $((this.config.rid.slice(0,1) === '#') ? this.config.rid : '#' + this.config.rid);
				};
				return this;
			}
		}
	}, 'ElementX');
	
	$.plugin('AjaxButton', {
		defaults: {
			e: 'click'
		}
	}, 'AjaxElement');
	
	$.plugin('AjaxSelect', {
		defaults: {
			e: 'change'
		},
		framework: {
			_run: function(options,done,fail,always) {
				var object = {};
				var dataobj = $.extend({}, { name: this.$elem.attr('name')}, { name: this.$elem.attr('data-sendname')});
				object[dataobj.name] = this.elem.value;
				this.ajaxcall.data = $.extend({ }, this.ajaxcall.data, object);
				this._execute(options,done,fail,always);
			}
		}
	}, 'AjaxElement');
	
	$.plugin('AjaxForm', {
		defaults: {
			e: 'submit',
			useNew: false,
			validate: false,
			catchEnter: true,
			preventDefault: true,
			frmdataFunc: function() {
				var qs;
				if (this.useNew) {
					var frmData = this.$elem.serializeObject();
					qs = $.extend({}, this.ajaxcall.data, frmData);
				} else {
					qs = this.$elem.serialize();
				}
				this.ajaxcall.data = qs;
			},
			validateFunc: function() {
				return true;
			}
		},
		framework: {
			_run: function(options,done,fail,always) {
				//make something that goes through all conditional run functions?
				this.frmdataFunc();
				if(this._validate()) {
					this._execute(options,done,fail,always);
				}
			},
			_validate: function() {
				if (this.validate) {
					return this.validateFunc();
				}
				return true;
			}
		},
		builder: {
			metadataFn: function() {
				return {
					validate: $.toBoolUn(this.$elem.attr('data-validate')),
					catchEnter: $.toBoolUn(this.$elem.attr('data-catch-enter')),
					ajaxcall: {
						type: this.$elem.attr('method'),
						url: this.$elem.attr('action')
					}
				};
			}
		}
	}, 'AjaxElement');
	
	$.plugin('AjaxTab', {
		defaults: {
			e: 'click',
			loadOnce: false,
			loaded: 0
		},
		framework: {
			_run: function(options,done,fail,always) {
				if (this.loaded === 0) {
					this._execute(options,done,fail,always);
					if (this.loadOnce) { this.loaded = 1; }
				}
				
			}
		},
		builder: {
			metadataFn: function() {
				return {
					loadOnce: $.toBoolUn(this.$elem.attr('data-load-once'))
				};
			}
		}
	}, 'AjaxElement');
	
})( jQuery );