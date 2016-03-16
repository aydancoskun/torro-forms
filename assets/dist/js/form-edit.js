/*!
 * Torro Forms Version 1.0.0alpha1 (http://torro-forms.com)
 * Licensed under GNU General Public License v3 (http://www.gnu.org/licenses/gpl-3.0.html)
 */
(function ( exports, wp, $, translations ) {
	'use strict';

	/**
	 * Form_Builder constructor
	 */
	function Form_Builder( translations ) {
		this.translations = translations;

		this.extensions = {};

		this.selectors = {
			containers: '#containers',
			container_id: 'input[name="container_id"]',
			container_add: '#container-add',
			container_tab: '.tab-container',
			container_tabs: '.container-tabs',
			draggable_item: '#form-elements .formelement',
			droppable_area: '.torro-drag-drop-inside',
			element: '.formelement',
			drop_elements_here: '.drop-elements-here',
			delete_container_button: '.delete-container-button',
			delete_container_dialog: '#delete_container_dialog',
			delete_element_button: '.delete_form_element',
			delete_element_dialog: '#delete_formelement_dialog',
			deleted_containers: '#deleted_containers',
			deleted_elements: '#deleted_formelements',
			answers_sub: '.answers',
			answer_sub: '.answer',
			add_answer_button: '.add-answer',
			delete_answer_button: '.delete_answer',
			delete_answer_dialog: '#delete_answer_dialog',
			deleted_answers: '#deleted_answers',
			tabs: '.tabs',
			element_form_label: '.form-label',
			duplicate_form_button: '#form-duplicate-button',
			delete_results_button: '#form-delete-results',
			delete_results_dialog: '#delete_results_dialog'
		};
	}

	/**
	 * Form_Builder class
	 */
	Form_Builder.prototype = {
		init: function() {
			this.init_drag_and_drop();

			this.init_container_deletion();

			this.init_formelement_deletion();

			this.init_sortable_answers();

			this.init_container_addition();

			this.init_answer_addition();

			this.init_answer_deletion();

			this.init_answer_enter();

			this.init_tab_handling();

			this.init_element_title_rewrite();

			this.init_form_duplication();

			this.init_results_deletion();

			this.init_clipboard();

			this.init_form_redirections();

			this.init_access_controls();

			this.handle_templatetag_buttons();

			this.check_max_input_vars();

			this.init_container_tabs();
		},

		/**
		 * Initializing the overall drag and drop behavior
		 */
		init_drag_and_drop: function() {
			var self = this;

			// init draggable
			$( this.selectors.draggable_item ).draggable( {
				helper: 'clone',
				cursor: 'move',
				connectToSortable: this.selectors.droppable_area,
				addClasses: false,
				start: function( event, ui ) {
					var $element = ui.helper;

					$element.css( 'height', 'auto' ).css( 'width', '100px' );
				},
				stop: function( event, ui ) {
					var $element = ui.helper;
					var $container = $element.closest( '.torro-container' );

					$container.find( self.selectors.drop_elements_here ).hide();
					$element.css( 'width', '100%' ).css( 'height', 'auto' );
					$element.addClass( 'widget' );
				}
			});

			// init droppable
			function init_droppable( $droppable_area ) {
				$droppable_area.each( function( index, item ) {
					if( $( item ).find( self.selectors.element ).length == 0 ){
						$( item ).find( self.selectors.drop_elements_here ).show();
					}
				});

				$droppable_area.droppable({
					accept: self.selectors.draggable_item
				}).sortable({
					placeholder: 'form-element-placeholder',
					items: self.selectors.element,
					update: function( event, ui ) {
						var $element = ui.item;
						var container_id = $( this ).parent().find( self.selectors.container_id ).val();

						// init new element
						if ( ! $element.attr( 'id' ) ) {
							var element_id = 'temp_id_' + self.rand();

							$element.attr( 'id', 'element-' + element_id );
							$element.attr( 'data-element-id', element_id );
							$element.html( $element.html().replace( /replace_element_id/g, element_id ) );
							$element.html( $element.html().replace( /replace_container_id/g, container_id ) );

							$droppable_area.trigger( 'torro.element_dropped', {
								element: $element
							});

							if ( $element.data( 'element-type' ) ) {
								var data = {
									id: element_id,
									selector: '#' + element_id
								};
								$( document ).trigger( 'torro.insert_element_' + $element.data( 'element-type' ), [ data ] );
							}
						}

						// refresh sorting
						$( '#torro-container-' + container_id + ' ' + self.selectors.droppable_area + ' ' + self.selectors.element ).each( function( index ) {
							var element_id = $( this ).attr( 'data-element-id' );

							$( 'input[name^="containers\[' + container_id +'\]\[elements\]\[' + element_id + '\]\[container_id\]"]' ).val( container_id ) ;
							$( 'input[name^="containers\[' + container_id +'\]\[elements\]\[' + element_id + '\]\[sort\]"]' ).val( index ) ;
							$( 'input[name^="containers\[' + container_id +'\]\[elements\]\[' + element_id + '\]\[id\]"]' ).val( element_id ) ;
						});
					}
				});

				$droppable_area.on( 'torro.element_dropped', function( event, data ) {
					self.check_max_input_vars();
				});
			}

			init_droppable( $( self.selectors.droppable_area ) );
			$( document ).on( 'torro.insert_container', function( event, data ) {
				init_droppable( $( data.container_selector + ' ' + self.selectors.droppable_area ) );
			});
		},

		/**
		 * Additional functionality for container tabs
		 */
		init_container_tabs: function() {
			var self = this;

			$( self.selectors.container_tabs ).parent().tabs();

			$( self.selectors.container_tabs ).sortable({
				items: self.selectors.container_tab,
				stop: function(e,ui) {
					ui.item.parent().find( 'li' ).each( function( index, item ){
						var tab_container_id = $( item ).find( 'a' ).attr( 'href' );

						if( tab_container_id != undefined ) {
							var container_id = $(tab_container_id + ' input[name=container_id]').val();
							$('input[name^="containers\[' + container_id + '\]\[sort\]"]').val(index);
						}
					});

					$( self.selectors.container_tabs ).parent().tabs( "refresh" );
				}
			});

			function init_container_tab( $container_tab ) {
				$container_tab.on( 'dblclick', function(){
					$( this ).find( 'input' ).toggle().val( $( this ).find( 'a' ).html() ).focus();
					$( this ).find( 'a' ).toggle();
				});

				$container_tab.on( 'keydown blur dblclick', 'input', function( e ) {
					if ( e.type == "keydown" ) {
						if ( e.which == 13 ) {
							$( this ).toggle();
							$( this ).siblings('a').toggle().html($( this ).val());

							var tab_value = $( this ).val();
							var tab_container_id = $( this ).parent().find( 'a' ).attr( 'href' );
							var container_id = $( tab_container_id + ' input[name=container_id]' ).val();
							$( 'input[name^="containers\[' + container_id +'\]\[label\]"]' ).val( tab_value ) ;
						}
						if ( e.which == 38 || e.which == 40 || e.which == 37 || e.which == 39 || e.keyCode == 32 ) {
							e.stopPropagation();
						}
					} else if ( e.type == "focusout" ) {
						$( this ).toggle();
						$( this ).siblings('a').toggle().html($( this ).val());

						var tab_value = $( this ).val();
						var tab_container_id = $( this ).parent().find( 'a' ).attr( 'href' );
						var container_id = $( tab_container_id + ' input[name=container_id]' ).val();
						$( 'input[name^="containers\[' + container_id +'\]\[label\]"]' ).val( tab_value ) ;
					} else {
						e.stopPropagation();
					}
				});
			}

			init_container_tab( $( self.selectors.container_tab ) );
			$( document ).on( 'torro.insert_container', function( event, data ) {
				init_container_tab( $( data.tab_selector ) );
			});
		},

		/**
		 * Initializing container deletion
		 */
		init_container_deletion: function() {
			var self = this;
			var $container_delete_dialog = $( this.selectors.delete_container_dialog );

			$container_delete_dialog.dialog({
				'dialogClass'   : 'wp-dialog',
				'modal'         : true,
				'autoOpen'      : false,
				'closeOnEscape' : true,
				'minHeight'     : 80,
				'buttons'       : [
					{
						text: this.translations.yes,
						click: function() {
							if ( self.current_container_id ) {
								// only update deleted_containers list if the container was stored in DB before
								if ( 0 !== self.current_container_id.indexOf( 'temp_id' ) ) {
									var deleted_containers = $( self.selectors.deleted_containers ).val();

									if ( '' == deleted_containers ) {
										deleted_containers += self.current_container_id;
									} else {
										deleted_containers += ',' + self.current_container_id;
									}

									$( self.selectors.deleted_containers ).val( deleted_containers );
								}

								var tab_id = 'tab-container-' + self.current_container_id;
								var container_id = 'torro-container-' + self.current_container_id;

								var index = $( '#' + tab_id ).index();
								if ( index == 0 ) {
									index = 0;
								} else {
									index = index - 1;
								}

								$( '#' + tab_id ).remove();
								$( '#' + container_id ).remove();

								$( self.selectors.container_tabs ).parent().tabs( "refresh" );
								$( self.selectors.container_tabs ).parent().tabs( 'option', 'active', index );

								self.current_container_id = '';

								var data = {
									tab_id: tab_id,
									tab_selector: '#' + tab_id,
									container_id: container_id,
									container_selector: '#' + container_id
								};
								$( document ).trigger( 'torro.delete_container', [ data ] );
							}

							$( this ).dialog('close');
						}
					},
					{
						text: this.translations.no,
						click: function() {
							$( this ).dialog( "close" );
						}
					}
				]
			});

			$( this.selectors.containers ).on( 'click', this.selectors.delete_container_button, function( e ){
				e.preventDefault();

				self.current_container_id = $( this ).parent().parent().find( self.selectors.container_id ).val();
				$container_delete_dialog.dialog( 'open' );
			});
		},

		/**
         * Initializing form element deletion
         */
		init_formelement_deletion: function() {
			var self = this;
			var $form_delete_element_dialog = $( this.selectors.delete_element_dialog );

			$form_delete_element_dialog.dialog({
				'dialogClass'   : 'wp-dialog',
				'modal'         : true,
				'autoOpen'      : false,
				'closeOnEscape' : true,
				'minHeight'     : 80,
				'buttons'       : [
					{
						text: this.translations.yes,
						click: function() {
							if ( self.current_element_id ) {
								// only update deleted_elements list if the element was stored in DB before
								if ( 0 !== self.current_element_id.indexOf( 'temp_id' ) ) {
									var deleted_elements = $( self.selectors.deleted_elements ).val();

									if ( '' == deleted_elements ) {
										deleted_elements += self.current_element_id;
									} else {
										deleted_elements += ',' + self.current_element_id;
									}

									$( self.selectors.deleted_elements ).val( deleted_elements );
								}

								var $container = $( '#element-' + self.current_element_id ).parents( '.torro-container' );

								$( '#element-' + self.current_element_id ).remove();

								if ( $container.find( self.selectors.droppable_area + ' ' + self.selectors.element ).length < 1 ) {
									$container.find( self.selectors.drop_elements_here ).show();
								}

								if ( self.current_element_type ) {
									var data = {
										id: 'element-' + self.current_element_id,
										selector: '#element-' + self.current_element_id
									};
									$( document ).trigger( 'torro.delete_element_' + self.current_element_type, [ data ]);
								}
							}

							$( this ).dialog('close');
						}
					},
					{
						text: this.translations.no,
						click: function() {
							$( this ).dialog( "close" );
						}
					}
				]
			});

			$( document ).on( 'click', this.selectors.delete_element_button, function( e ){
				e.preventDefault();

				self.current_element_id = $( this ).closest( self.selectors.element ).attr( 'data-element-id' );
				self.current_element_type = $( this ).closest( self.selectors.element ).attr( 'data-element-type' );
				$form_delete_element_dialog.dialog( 'open' );
			});
		},

		/**
		 * Making answers in elements sortable
		 */
		init_sortable_answers: function() {
			var self = this;

			function init_droppable( $droppable_area ) {
				function make_sortable( $group ) {
					$group.sortable({
						update: function(  event, ui ){
							var container_id = $( this ).closest( '.torro-container' ).attr( 'id' );
							var element_id = $( this ).closest( '.widget' ).attr('id');
							var order = [];

							if ( ! container_id || ! element_id ) {
								console.error( 'Error: Missing element or container ID!' );
								return;
							}

							container_id = container_id.replace( 'torro-container-', '' );
							element_id = element_id.replace( 'element-', '' );

							$( this ).find( self.selectors.answer_sub ).each( function( e ) {
								var nr = $( this ).attr( 'id' );
								nr = nr.split( '_' );
								nr = nr[1];

								var input_name = 'input[name="containers\[' + container_id + '\]\[elements\]\[' + element_id + '\]\[answers\]\[id_' + nr + '\]\[sort\]"]';
								var index = $( this ).index();
								$( input_name ).val( index ) ;
							});
						},
						items: self.selectors.answer_sub
					});
				}

				make_sortable( $droppable_area.find( self.selectors.answers_sub ) );
				$droppable_area.on( 'torro.element_dropped', function( event, data ) {
					var $element = data.element;

					make_sortable( $element.find( self.selectors.answers_sub ) );
				});
			}

			init_droppable( $( this.selectors.droppable_area ) );
			$( document ).on( 'torro.insert_container', function( event, data ) {
				init_droppable( $( data.container_selector + ' ' + self.selectors.droppable_area ) );
			});
		},

		/**
		 * Initializing container addition
		 */
		init_container_addition: function() {
			var self = this;

			$( this.selectors.container_add ).on( 'click', function() {
				var count_container = $( self.selectors.container_tabs ).parent().find( '.torro-container' ).length;

				var id =  'temp_id_' + self.rand();
				var container_id = 'torro-container-' + id;
				var tab_id = 'tab-container-' + id;

				var tab = '<li id="' + tab_id + '" class="tab-container"><input class="txt" type="text"/><a href="#' + container_id + '">' + self.translations.page + ' ' + ( count_container + 1 ) +  '</a></li>';

				var container = '<div id="' + container_id + '" class="torro-container">';
				container += '<div class="torro-drag-drop-inside">';
				container += '<div class="drop-elements-here">' + self.translations.drop_elements_here + '</div>';
				container += '</div>';
				container += '<div class="container-buttons">';
				container += '<input type="button" name="delete_container" value="' +  self.translations.delete_page + '" class="button delete-container-button" />';
				container += '</div>';
				container += '<input type="hidden" name="container_id" value="'+ id +'" />';
				container += '<input type="hidden" name="containers[' + id + '][id]" value="'+ id +'" />';
				container += '<input type="hidden" name="containers[' + id + '][label]" value="Page '+ ( count_container + 1 ) +'" />';
				container += '<input type="hidden" name="containers[' + id + '][sort]" value="'+ count_container +'" />';
				container += '</div>';

				$( tab ).insertBefore( this );
				$( self.selectors.container_tabs ).parent().append( container );
				$( self.selectors.container_tabs ).parent().tabs( "refresh" );

				var index = $( self.selectors.container_tabs + ' li:last-child' ).parent().index() - 1;
				$( self.selectors.container_tabs ).parent().tabs( 'option', 'active', index );

				var data = {
					tab_id: tab_id,
					tab_selector: '#' + tab_id,
					container_id: container_id,
					container_selector: '#' + container_id
				};
				$( document ).trigger( 'torro.insert_container', [ data ] );
			});
		},

		/**
		 * Initializing answer addition button in elements
		 */
		init_answer_addition: function() {
			var self = this;
			$( document ).on( 'click', this.selectors.add_answer_button, function() {
				var $button = $( this );
				var container_id = $button.attr( 'data-container-id' );
				var element_id = $button.attr( 'data-element-id' );

				if ( ! container_id || ! element_id ) {
					console.error( 'Error: Missing element or container ID!' );
					return;
				}

				var nr = 'temp_id_' + self.rand();
				var section_val = $( 'input[name="containers\[' + container_id + '\]\[elements\]\[' + element_id + '\]\[sections\]"]' ).val();

				// Setting up new answer HTML
				var answer_content = '<div class="answer" id="answer_' + nr + '">';
				answer_content = answer_content + '<p><input type="text" id="answer_' + nr + '_input" name="containers[' + container_id + '][elements][' + element_id + '][answers][' + nr + '][answer]" class="element-answer" /></p>';
				answer_content = answer_content + '<input type="hidden" name="containers[' + container_id + '][elements][' + element_id + '][answers][' + nr + '][id]" />';
				answer_content = answer_content + '<input type="hidden" name="containers[' + container_id + '][elements][' + element_id + '][answers][' + nr + '][sort]" />';

				if ( 'yes' == section_val ) {
					var section_key = $button.parent().find( 'input[name="section_key"]' ).val();
					answer_content = answer_content + '<input type="hidden" name="containers[' + container_id + '][elements][' + element_id + '][answers][' + nr + '][section]" value="' + section_key + '" />';
				}

				answer_content = answer_content + ' <input type="button" value="' + self.translations.delete + '" class="delete_answer button answer_action"></div>';

				// Getting order number for new answer
				var order = 0;
				$button.parent().find( '.answer' ).each( function( e ) { order++; });

				// Adding Content
				if ( 'yes' == section_val ) {
					var selector = '#element-' + element_id + ' #section_' + section_key + ' ' + self.selectors.answers_sub;
				} else {
					var selector = '#element-' + element_id + ' ' + self.selectors.answers_sub;
				}

				$( selector ).append( answer_content );

				var $answer_input = $( '#answer_' + nr + '_input' );
				$answer_input.focus();

				// Adding sorting number
				$( 'input[name="containers\[' + container_id + '\]\[elements\]\[' + element_id + '\]\[answers\]\[id_' + nr + '\]\[sort\]"]' ).val( order );
			});
		},

		/**
		 * Initializing answer deletion button in elements
		 */
		init_answer_deletion: function() {
			var self = this;
			var $form_deleteanswer_dialog = $( this.selectors.delete_answer_dialog );

			$form_deleteanswer_dialog.dialog({
				'dialogClass'   : 'wp-dialog',
				'modal'         : true,
				'autoOpen'      : false,
				'closeOnEscape' : true,
				'minHeight'		: 80,
				'buttons'       : [
					{
						text: this.translations.yes,
						click: function() {
							if ( self.current_answer_id ) {
								self.current_answer_id = self.current_answer_id.substring( 7 );

								// only update deleted_answers list if the answer was stored in DB before
								if ( 0 !== self.current_answer_id.indexOf( 'temp_id' ) ) {
									var deleted_answers = $( self.selectors.deleted_answers ).val();

									if ( '' == deleted_answers ) {
										deleted_answers += self.current_answer_id;
									} else {
										deleted_answers += ',' + self.current_answer_id;
									}

									$( self.selectors.deleted_answers ).val( deleted_answers );
								}

								$( '#answer_' + self.current_answer_id ).remove();

								self.current_answer_id = '';
							}

							$( this ).dialog('close');
						}
					},
					{
						text: this.translations.no,
						click: function() {
							$( this ).dialog( "close" );
						}
					}
				]
			});

			$( document ).on( 'click', this.selectors.delete_answer_button, function( e ){
				e.preventDefault();

				self.current_answer_id = $( this ).closest( '.answer' ).attr('id');
				$form_deleteanswer_dialog.dialog( 'open' );
			});
		},

		init_answer_enter: function() {
			var self = this;

			$( document ).on( 'keydown', '.element-answer', function( e ) {
				if ( 13 === e.keyCode ) {
					e.preventDefault();
					var $add_answer_button = $( this ).parents( self.selectors.tabs ).find( self.selectors.add_answer_button );
					$add_answer_button.trigger( 'click' );
				}
			});
		},

		/**
         * Initializing jquery tabs in elements
         */
		init_tab_handling: function() {
			var self = this;

			function init_droppable( $droppable_area ) {
				function make_tabs( $element ) {
					$element.tabs({
						active: 0
					});
				}

				make_tabs( $droppable_area.find( self.selectors.tabs ) );
				$droppable_area.on( 'torro.element_dropped', function( event, data ) {
					var $element = data.element;

					make_tabs( $element.find( self.selectors.tabs ) );
				});
			}

			$( self.selectors.tabs ).tabs({
				active: 0
			});

			init_droppable( $( this.selectors.droppable_area ) );

			$( document ).on( 'torro.insert_container', function( event, data ) {
				init_droppable( $( data.container_selector + ' ' + self.selectors.droppable_area ) );
			});
		},

		/**
		 * Live typing of element headline
		 */
		init_element_title_rewrite: function() {
			$( this.selectors.droppable_area ).on( 'input', this.selectors.element_form_label, function(){
				var element_id = $( this ).closest( '.widget' ).attr('id');
				$( '#' + element_id + ' .widget-title h4' ).text( $( this ).val() );
            });
		},

		/**
		 * Initializing the form duplication button
		 */
		init_form_duplication: function() {
			var self = this;
			$( this.selectors.duplicate_form_button ).on( 'click', function() {
				var $button = $( this );

				if ( $button.hasClass( 'button' ) ) {
					$button.addClass( 'button-loading' );

					wp.ajax.post( 'torro_duplicate_form', {
						nonce: self.translations.nonce_duplicate_form,
						form_id: self.get_form_id(),
					}).done( function( response ) {
						var response_text = self.translations.duplicated_form_successfully + ' <a href="' + response.admin_url + '">' + self.translations.edit_form + '</a>';
						var $notices = $( '#form-options .notices' );

						$notices.html( response_text );
						$notices.show();

						$button.removeClass( 'button-loading' );

						$notices.fadeOut( 5000 );
					}).fail( function( message ) {
						console.error( message );
					});
				} else {
					$button.addClass( 'button' );
				}
			});
		},

		/**
		 * Initializing the Delete Results button
		 */
		init_results_deletion: function() {
			var self = this;
			$( this.selectors.delete_results_button ).on( 'click', function() {
				var $button = $( this );

				if ( $button.hasClass( 'button' ) ) {

					var $form_deleteresults_dialog = $( self.selectors.delete_results_dialog );

					$form_deleteresults_dialog.dialog({
						'dialogClass'	: 'wp-dialog',
						'modal'			: true,
						'autoOpen'		: false,
						'closeOnEscape'	: true,
						'minHeight'		: 80,
						'buttons'		: [
							{
								text: self.translations.yes,
								click: function() {
									$( this ).dialog('close');
									$button.addClass( 'button-loading' );

									wp.ajax.post( 'torro_delete_responses', {
										nonce: self.translations.nonce_delete_responses,
										form_id: self.get_form_id()
									}).done( function( response ) {
										$( document ).trigger( 'torro.delete_results', [ response ]);

										$( '#form-functions-notices').html( self.translations.deleted_results_successfully );
										$( '#form-functions-notices').show();

										$button.removeClass( 'button-loading' );

										$( '#form-functions-notices' ).fadeOut( 5000 );
									}).fail( function( message ) {
										console.error( message );
									});
								}
							},
							{
								text: self.translations.no,
								click: function() {
									$( this ).dialog( "close" );
								}
							},
						],
					});

					$form_deleteresults_dialog.dialog( 'open' );

				} else {
					$button.addClass( 'button' );
				}
			});
		},

		/**
		 * Initializing clipboard and tooltips
		 */
		init_clipboard: function() {
			var self = this;
			var clipboard = new Clipboard( '.clipboard' );

			clipboard.on( 'success', function( e ) {
				var elem = e.trigger;

				e.clearSelection();

				elem.setAttribute( 'class', 'clipboard tooltipped tooltipped-s button' );
				elem.setAttribute( 'aria-label', self.translations.copied );
			});

			var btns = document.querySelectorAll( '.clipboard' );

			for ( var i = 0; i < btns.length; i++ ) {
				btns[ i ].addEventListener( 'mouseleave', function( e ) {
					e.currentTarget.setAttribute( 'class', 'clipboard button' );
					e.currentTarget.removeAttribute( 'aria-label' );
				});
			}
		},

		init_form_redirections: function() {
			var toggle_boxes = function() {
				$( '.redirect-content' ).hide(); // Hiding all boxes
				$( '#' +  $( '#redirect_type' ).val() ).show(); // Showing selected box
			}

			toggle_boxes();

			$( document ).on( 'change', '#redirect_type', function() {
				toggle_boxes();
			});
		},

		init_access_controls: function() {
			var toggle_boxes = function() {
				$( '.form-access-controls-content' ).hide(); // Hiding all boxes
				$( '#form-access-controls-content-' +  $( '#form-access-controls-option' ).val() ).show(); // Showing selected box
			}

			toggle_boxes();

			$( document ).on( 'change', '#form-access-controls-option', function() {
				toggle_boxes();
			});
		},

		/**
		 * Handling the Templatetag Button
		 */
		handle_templatetag_buttons: function() {
			$( 'html' ).on( 'click', function() {
				$( '.torro-templatetag-list' ).hide();
			});

			$( '.torro-templatetag-button' ).on( 'click', function( e ) {
				var $list = $( this ).find( '.torro-templatetag-list' );

				if ( 'none' == $list.css( 'display' ) ) {
					$list.show();
				} else {
					$list.hide();
				}

				e.stopPropagation();
			});

			var $template_tag = $( '.torro-templatetag-list .torro-templatetag' );

			$template_tag.unbind();

			$template_tag.on( 'click', function() {
				var tag_name = '{' + $( this ).attr( 'data-tagname' ) + '}';
				var input_id = $( this ).attr( 'data-input-id' );
				var editor = tinymce.get( input_id );

				if (editor && editor instanceof tinymce.Editor) {
					editor.insertContent( tag_name );
				}else{
					var $input = $( 'input[name="' + input_id + '"]' );
					$input.val( $input.val() + tag_name );
				}
			});
		},

		/**
         * Counting form input vars and showing
         */
		check_max_input_vars: function() {
			var max_input_vars =  parseInt( $( "#max_input_vars" ).val() );
			var input_vars = parseInt( this.count_form_elements( '#post' ) );
			var alert_zone = 50; // The alert will start the alert X before max_input_vars have been reached

			var msg_near_limit = '<strong>' + this.translations.max_fields_near_limit + '</strong> (' + input_vars + ' ' + this.translations.of + ' ' + max_input_vars + ')<br /> ' + this.translations.max_fields_todo;
			var msg_over_limit = '<strong>' + this.translations.max_fields_over_limit + '</strong> (' + input_vars + ' ' + this.translations.of + ' ' + max_input_vars + ')<br /> ' + this.translations.max_fields_todo;

			if( input_vars + alert_zone >= max_input_vars ){
				$( "#form-messages" )
					.removeClass( 'notice error updated' )
					.addClass( 'notice' )
					.html( '<p>' +  msg_near_limit + '</p>' )
					.show();
			}

			if( input_vars >= max_input_vars ){
				$( "#form-messages" )
					.removeClass( 'notice error updated' )
					.addClass( 'error' )
					.html( '<p>' +  msg_over_limit + '</p>' )
					.show();
			}
		},

		/**
         * Counting all input fields of a selected container
         */
		count_form_elements: function( selector ) {
			var count_inputs = $( selector ).find( 'input' ).length;
			var count_textareas = $( selector ).find( 'textarea' ).length;
			var count_select = $( selector ).find( 'select' ).length;

			var count_all = count_inputs + count_textareas + count_select;

			return count_all;
		},

		/**
         * Returns the current form ID
         */
		get_form_id: function() {
			return $( '#post_ID' ).val();
		},

		init_extensions: function() {
			var keys = Object.keys( this.extensions );
			for ( var i in keys ) {
				this.extensions[ keys[ i ] ].init();
			}
		},

		add_extension: function( name, obj ) {
			this.extensions[ name ] = obj;
		},

		get_extension: function( name ) {
			return this.extensions[ name ];
		},

		get_extensions: function() {
			return this.extensions;
		},

		rand: function() {
			var now = new Date();
			var random = Math.floor( Math.random() * ( 10000 - 10 + 1 ) ) + 10;

			random = random * now.getTime();
			random = random.toString();

			return random;
		}
	};

	var form_builder = new Form_Builder( translations );

	$( document ).ready( function() {
		form_builder.init();
		form_builder.init_extensions();
	});

	exports.form_builder = form_builder;

}( window, wp, jQuery, translation_fb ) );