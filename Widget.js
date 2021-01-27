///////////////////////////////////////////////////////////////////////////
// Copyright © Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define([
	'dojo/_base/declare', 
  'jimu/BaseWidget', 
  "dojo/Deferred",
  "dojo/_base/lang",
	'esri/geometry/projection', 
	'esri/geometry/coordinateFormatter', 
	'jimu/dijit/Message',
	'libs/jquery/jquery',
	'esri/layers/GraphicsLayer',
	"dojo/_base/array",
	],function (
		declare, 
    BaseWidget, 
    Deferred,
    lang,
		projection, 
		coordinateFormatter,
		Message,
		jquery,
		GraphicsLayer,
    arrayUtils) 
    {

      //To create a widget, you need to derive from BaseWidget.
      return declare([BaseWidget], {
        // DemoWidget code goes here

        //please note that this property is be set by the framework when widget is loaded.
        //templateString: template,
        name: "DownloadService",
        baseClass: 'jimu-widget-download-service',
        
        startup: function () {
          var token = localStorage.getItem("usertoken");
          console.log('usertoken: ', token);
          console.log('appConfig: ', this.appConfig);
          if(token === null)
          {
            $("#download-service-login").show();
            $("#contenido").hide();
          }else{
            $("#download-service-login").hide();
            $("#contenido").show();
            $("#listado-capas").html("");

            var username = localStorage.getItem("username");
            $("#login-active").show()
            $("#lbl-usuario").html('Usuario portal: ' + username);

             // // Obtengo los services
            this.getFeatureServer(token).then(
              lang.hitch(this, function(response) { 
                console.log('response FeatureServer: ', response);
                this.getLayers(response).then(
                  lang.hitch(this, function(resp) { 
                    console.log('response Layers: ', resp);
                  }),
                  function(objErr) {
                    console.log('request failed', objErr)
                  }
                );
              }),
              function(objErr) {
                console.log('request failed', objErr)
              }
            );
          }

          // localStorage.removeItem('usertoken');

          this.inherited(arguments);        
        },
        _onClickSalir: function () {
          console.log('acaaaa');
          localStorage.removeItem('usertoken');
          localStorage.removeItem('username');
          localStorage.removeItem('password');
          $("#login-active").hide();
          $("#contenido").hide();
          $("#lbl-usuario").html("");
          $("#listado-capas").html("");
          $("#link-descarga").html("");
          $("#download-service-login").show();
        },
        _search: function () {
          console.log('acaaaaaa');
          // Declare variables
          var input, filter, content, details, summary, i, txtValue;
          input = document.getElementById('search');
          filter = input.value.toLowerCase();
          content = document.getElementById("listado-capas");
          details = content.getElementsByTagName('details');

          // Loop through all list items, and hide those who don't match the search query
          for (i = 0; i < details.length; i++) {
            summary = details[i].getElementsByTagName("summary")[0];
            txtValue = summary.textContent || summary.innerText;
            if (txtValue.toLowerCase().indexOf(filter) > -1) {
              details[i].style.display = "";
            } else {
              details[i].style.display = "none";
            }
          }
        },
        _onClickClear: function () {
          $("#search").val("");
          content = document.getElementById("listado-capas");
          ar = content.getElementsByTagName('details');
          for (i = 0; i < ar.length; ++i){
            ar[i].style.display = "";
          }
        },
        _onClickLoginPortal: function () {
          var username = $("#username").val();
          var password = $("#password").val();
          if (username !== "" && password !== "") 
          {
            this.getToken(username, password).then(
              lang.hitch(this, function(token) { 
                localStorage.setItem("usertoken", token);
                localStorage.setItem("username", username);
                localStorage.setItem("password", password);
                $("#contenido").show();
                $("#listado-capas").html("");
                $("#btn-descarga").show();
                $("#download-service-login").hide();
                $("#login-active").show()
                $("#lbl-usuario").html('Usuario portal: ' + username);

                 // // Obtengo los services
                this.getFeatureServer(token).then(
                  lang.hitch(this, function(response) { 
                    console.log('response FeatureServer: ', response);
                    this.getLayers(response).then(
                      lang.hitch(this, function(resp) { 
                        console.log('response Layers: ', resp);
                      }),
                      function(objErr) {
                        console.log('request failed', objErr)
                      }
                    );
                  }),
                  function(objErr) {
                    console.log('request failed', objErr)
                  }
                );
              }),
              lang.hitch(this, function(msg) {
                console.warn(msg);
                console.log('request failed', msg)
                this.showMessage(msg, 'error');
                $("#password").val("");
              })
           );
          }else{
            this.showMessage('Debe ingresar usuario y contraseña', 'error');
          }
        },
        getFeatureServer: function (token) {
          var deferred = new Deferred();
          var services = [];
          var res = {};
          console.log('token: ', token);
          let url = this.config.urlBase + this.config.layersFolder + '?token=' + token + '&f=json'
          this.getRequest(url).then(
            lang.hitch(this, function(response) { 
              console.log('response: ', response);
              if (response.hasOwnProperty("services")){
                console.log('response bien: ', response);
                arrayUtils.forEach(response.services, function(f) {
                  if(f.type === 'FeatureServer') { services.push(f); }
                }, this);
                res.services = services
                res.token = token
                deferred.resolve(res);
              }else{
                //TODO: si falla el token del localstorage, aca deberia remover
                // localStorage.removeItem('usertoken');
                // Mostrar el login y ocultar listado-capas, opciones y btn-descarga
                this._onClickSalir()
                console.log('response error: ', response);
                var mensaje = response.error.message
                this.showMessage(mensaje, 'error');
                deferred.reject();
              }
            }),
            function(objErr) {
              console.log('request failed', objErr)
              deferred.reject();
            }
          );
          return deferred.promise;
        },
        getLayers: function (resp) {
          $("#loading-contenido").show();
          var deferred = new Deferred();
          var services = resp.services
          var token = resp.token
          arrayUtils.forEach(services, function(f) {
            let url = this.config.urlBase + f.name + '/FeatureServer?token=' + token + '&f=json'
            this.getRequest(url).then(
              lang.hitch(this, function(response) { 
                if(response.layers !== undefined && response.layers.length > 0)
                {
                  var html = '';
                  html += '<details><summary>' + f.name + '</summary>'
                  arrayUtils.forEach(response.layers, function(layer) {
                      // console.log('Layer: ', layer);
                      html += '<label class="label-layer">'
                      html += '<input type="checkbox" data-parent="' + f.name + '" data-name="' + layer.name + '" data-code="' + layer.id + '" style="margin-right: 10px;" aria-label="' + layer.name + '">'
                      html += layer.name + '</label><br />'
                    }, this);
                  html += '</details>'
                  $("#loading-contenido").hide();
                  $('#listado-capas').append(html);
                }else{
                  console.log(`Folder sin permisos: ${f.name}`);
                }
              }),
              function(objErr) {
                console.log('request failed', objErr)
                deferred.reject();
              }
            );
          }, this);
          deferred.resolve('ok');
          return deferred.promise;
        },
        _onClickDownload: function () {
          var layers = [];
          var config = this.config;
          
          $('#listado-capas input:checked').each(function() {
            let url = config.urlBase + $(this).data('parent') + '/FeatureServer/' + $(this).data('code')
            layers.push(url);
          });

          if(layers.length > 0)
          {
            $("#loading-contenido").show();
            $("#btn-descarga").hide();
            $("#link-descarga").hide();

            var output = $('#format option:selected').val();
            var sr = $('#sr option:selected').val();
            var username = localStorage.getItem("username");
            var password = localStorage.getItem("password");

            let params = {
              'f': 'json',
              'env:outSR': 102100,
              'Service_url_Layer': '["' + layers.join('","') + '"]',
              'Output_type': output,
              'username': username,
              'password': password,
              'spatialreference': sr,
              'Url_Portal': config.urlPortal
            };

            let query = Object.keys(params)
              .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
              .join('&');
    
            let url = config.urlGeoproceso + '?' + query;

            this.getRequest(url).then(
              lang.hitch(this, function(response) { 
                if(response.jobStatus === 'esriJobSubmitted')
                {
                  var jobId = response.jobId;
                  var urlJob = config.urlJob;
                  var time = 0
                  const timeValue = setInterval((interval) => {
                    time += 3
                    timestamp = Date.now()
                    preventCache = time * timestamp
                    console.log('preventCache: ', preventCache);
                    var params = {
                      'f': 'json',
                      'dojo.preventCache': preventCache
                    };
  
                    var query = Object.keys(params)
                      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
                      .join('&');
            
                    var url = urlJob + jobId + '?' + query;
  
                    this.getRequest(url).then(
                      lang.hitch(this, function(response) { 
                        console.log('response job: ', response);
                        if(response.jobStatus === 'esriJobSucceeded'){

                          clearInterval(timeValue);
                          $("#loading-contenido").hide();

                          let urlJob = config.urlJob;

                          let params = {
                            'f': 'json',
                            'returnType': 'data',
                            'dojo.preventCache': Date.now()
                          };

                          let query = Object.keys(params)
                            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
                            .join('&');

                          let url = urlJob + jobId + '/results/Zipfile?' + query;
                          console.log('url zipfile: ', url);

                          this.getRequest(url).then(
                            lang.hitch(this, function(response) { 
                              console.log('response zipfile: ', response);
                              let urlZipFile = response.value.url;
                              let html = 'En el siguiente <a href="' + urlZipFile + '" target="_blank">enlace</a> puedes descargar las capas seleccionadas.'
                              $("#link-descarga").html(html).show();
                              $("#btn-descarga").show();
                            }), 
                            function(objErr) {
                              console.log('request failed', objErr)
                              this.showMessage(objErr, 'error');
                            }
                          );
                        } else if (response.jobStatus === 'esriJobFailed') {
                          clearInterval(timeValue);
                          $("#btn-descarga").show();
                          $("#loading-contenido").hide();
                          for (key in response.messages)
                          {
                            if (response.messages[key].type === 'esriJobMessageTypeError')
                            {
                              this.showMessage(response.messages[key].description, 'error');
                              return;
                            }
                          }
                        } 
                      }),
                      function(objErr) {
                        console.log('request failed', objErr)
                        this.showMessage(objErr, 'error');
                      }
                    );
                  }, 2000);

                }else{
                  $("#loading-contenido").hide();
                  this.showMessage('Hubo un error al intentar descargar la(s) capa(s)', 'error')
                }
              }),
              function(objErr) {
                console.log('request failed', objErr)
                this.showMessage(objErr, 'error');
                $("#loading-contenido").hide();
              }
            );

          }else{
            this.showMessage('Debe seleccionar al menos una capa', 'error')
          }
          console.log('layers: ', layers);
        },
        getRequest: function (url) {
          try{
            var deferred = new Deferred();
            fetch(url)
              .then(data => data.text())
              .then((text) => {
                var data = JSON.parse(text);
                deferred.resolve(data);
              }).catch(function (error) {
                console.log('request failed', error)
                deferred.reject();
              }
            );
          } catch(err) {
            console.log('request failed', err)
            deferred.reject();
          }
          return deferred.promise;
        },
        postRequest: function (url, formData) {
          try{
            var deferred = new Deferred();
            
            let fetchData = {
                method: 'POST',
                body: formData,
                headers: new Headers()
            }
    
            fetch(url, fetchData)
              .then(data => data.text())
              .then((text) => {
                var data = JSON.parse(text);
                console.log('responseee: ', data)
                deferred.resolve(data);
    
              }).catch(function (error) {
                console.log('request failed', error)
                deferred.reject();
              }
            );
          } catch(err) {
            console.log('request failed', err)
            deferred.reject();
          }
          return deferred.promise;
        },
        getToken: function (username, password) {
          try{
            var deferred = new Deferred();
            
            let urlToken = this.config.urlToken;
            let referer = this.config.tokenReferer;
  
            let formData = new FormData();
            formData.append('f', 'json');
            formData.append('username', username);
            formData.append('password', password);
            formData.append('referer', referer);
            // 60: 1 hora
            // 1440: 1 dia
            // 20160: 2 semanas
            formData.append('expiration', 20160);

            console.log('formData: ', formData);

            this.postRequest(urlToken, formData).then(
              lang.hitch(this, function(objRes) { 
                console.log('objRes: ', objRes)
                if (objRes.hasOwnProperty("token"))
                {
                  deferred.resolve(objRes.token);
                } else {
                  deferred.reject(objRes.error.details[0]);
                }
              }),
              function(objErr) {
                console.log('request failed', objErr)
                deferred.reject([]);
              }
            );
            
          } catch(err) {
            console.log('request failed', err)
            deferred.reject();
          }
          return deferred.promise;
        },
        showMessage: function (msg, type) {
          var class_icon = "message-info-icon";
          switch (type) {
            case "error":
              class_icon = "message-error-icon";
              break;
              case "warning":
                class_icon = "message-warning-icon";
                break;
            }
            var content = '<i class="' + class_icon + '">&nbsp;</i>' + msg;
            new Message({
              titleLabel: type.toUpperCase(),
              message: content
            });
        },          
        postCreate: function () {
          this.inherited(arguments);
          console.log('postCreate');
        },
        onOpen: function () {
          console.log('onOpen');
        },
        onClose: function () {
          console.log('onClose');
        },
        onMinimize: function () {
          console.log('onMinimize');
        },
        onMaximize: function () {
          console.log('onMaximize');
        },
        onSignIn: function (credential) {
          console.log('onSignIn');
        },
        onSignOut: function () {
          console.log('onSignOut');
        }
      });
    }
);