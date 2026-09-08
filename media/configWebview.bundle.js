/*! For license information please see configWebview.bundle.js.LICENSE.txt */
(()=>{"use strict";const e=globalThis,t=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),i=new WeakMap;class s{constructor(e,t,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const o=this.t;if(t&&void 0===e){const t=void 0!==o&&1===o.length;t&&(e=i.get(o)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),t&&i.set(o,e))}return e}toString(){return this.cssText}}const n=e=>new s("string"==typeof e?e:e+"",void 0,o),r=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,o,i)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(o)+e[i+1],e[0]);return new s(i,e,o)},a=(o,i)=>{if(t)o.adoptedStyleSheets=i.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const t of i){const i=document.createElement("style"),s=e.litNonce;void 0!==s&&i.setAttribute("nonce",s),i.textContent=t.cssText,o.appendChild(i)}},l=t?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const o of e.cssRules)t+=o.cssText;return n(t)})(e):e,{is:c,defineProperty:d,getOwnPropertyDescriptor:h,getOwnPropertyNames:p,getOwnPropertySymbols:u,getPrototypeOf:v}=Object,b=globalThis,f=b.trustedTypes,g=f?f.emptyScript:"",_=b.reactiveElementPolyfillSupport,m=(e,t)=>e,y={toAttribute(e,t){switch(t){case Boolean:e=e?g:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let o=e;switch(t){case Boolean:o=null!==e;break;case Number:o=null===e?null:Number(e);break;case Object:case Array:try{o=JSON.parse(e)}catch(e){o=null}}return o}},x=(e,t)=>!c(e,t),w={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol("metadata"),b.litPropertyMetadata??=new WeakMap;class k extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=w){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const o=Symbol(),i=this.getPropertyDescriptor(e,o,t);void 0!==i&&d(this.prototype,e,i)}}static getPropertyDescriptor(e,t,o){const{get:i,set:s}=h(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:i,set(t){const n=i?.call(this);s?.call(this,t),this.requestUpdate(e,n,o)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??w}static _$Ei(){if(this.hasOwnProperty(m("elementProperties")))return;const e=v(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(m("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m("properties"))){const e=this.properties,t=[...p(e),...u(e)];for(const o of t)this.createProperty(o,e[o])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,o]of t)this.elementProperties.set(e,o)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const o=this._$Eu(e,t);void 0!==o&&this._$Eh.set(o,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const o=new Set(e.flat(1/0).reverse());for(const e of o)t.unshift(l(e))}else void 0!==e&&t.push(l(e));return t}static _$Eu(e,t){const o=t.attribute;return!1===o?void 0:"string"==typeof o?o:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const o of t.keys())this.hasOwnProperty(o)&&(e.set(o,this[o]),delete this[o]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return a(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,o){this._$AK(e,o)}_$ET(e,t){const o=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,o);if(void 0!==i&&!0===o.reflect){const s=(void 0!==o.converter?.toAttribute?o.converter:y).toAttribute(t,o.type);this._$Em=e,null==s?this.removeAttribute(i):this.setAttribute(i,s),this._$Em=null}}_$AK(e,t){const o=this.constructor,i=o._$Eh.get(e);if(void 0!==i&&this._$Em!==i){const e=o.getPropertyOptions(i),s="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:y;this._$Em=i;const n=s.fromAttribute(t,e.type);this[i]=n??this._$Ej?.get(i)??n,this._$Em=null}}requestUpdate(e,t,o,i=!1,s){if(void 0!==e){const n=this.constructor;if(!1===i&&(s=this[e]),o??=n.getPropertyOptions(e),!((o.hasChanged??x)(s,t)||o.useDefault&&o.reflect&&s===this._$Ej?.get(e)&&!this.hasAttribute(n._$Eu(e,o))))return;this.C(e,t,o)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:o,reflect:i,wrapped:s},n){o&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),!0!==s||void 0!==n)||(this._$AL.has(e)||(this.hasUpdated||o||(t=void 0),this._$AL.set(e,t)),!0===i&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,o]of e){const{wrapped:e}=o,i=this[t];!0!==e||this._$AL.has(t)||void 0===i||this.C(t,void 0,o,i)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}}k.elementStyles=[],k.shadowRootOptions={mode:"open"},k[m("elementProperties")]=new Map,k[m("finalized")]=new Map,_?.({ReactiveElement:k}),(b.reactiveElementVersions??=[]).push("2.1.2");const C=globalThis,S=e=>e,$=C.trustedTypes,I=$?$.createPolicy("lit-html",{createHTML:e=>e}):void 0,E="$lit$",A=`lit$${Math.random().toFixed(9).slice(2)}$`,P="?"+A,O=`<${P}>`,R=document,B=()=>R.createComment(""),z=e=>null===e||"object"!=typeof e&&"function"!=typeof e,D=Array.isArray,V=e=>D(e)||"function"==typeof e?.[Symbol.iterator],L="[ \t\n\f\r]",F=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,M=/-->/g,T=/>/g,H=RegExp(`>|${L}(?:([^\\s"'>=/]+)(${L}*=${L}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),j=/'/g,q=/"/g,U=/^(?:script|style|textarea|title)$/i,N=e=>(t,...o)=>({_$litType$:e,strings:t,values:o}),W=N(1),K=N(2),G=(N(3),Symbol.for("lit-noChange")),Y=Symbol.for("lit-nothing"),X=new WeakMap,Z=R.createTreeWalker(R,129);function J(e,t){if(!D(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==I?I.createHTML(t):t}const Q=(e,t)=>{const o=e.length-1,i=[];let s,n=2===t?"<svg>":3===t?"<math>":"",r=F;for(let t=0;t<o;t++){const o=e[t];let a,l,c=-1,d=0;for(;d<o.length&&(r.lastIndex=d,l=r.exec(o),null!==l);)d=r.lastIndex,r===F?"!--"===l[1]?r=M:void 0!==l[1]?r=T:void 0!==l[2]?(U.test(l[2])&&(s=RegExp("</"+l[2],"g")),r=H):void 0!==l[3]&&(r=H):r===H?">"===l[0]?(r=s??F,c=-1):void 0===l[1]?c=-2:(c=r.lastIndex-l[2].length,a=l[1],r=void 0===l[3]?H:'"'===l[3]?q:j):r===q||r===j?r=H:r===M||r===T?r=F:(r=H,s=void 0);const h=r===H&&e[t+1].startsWith("/>")?" ":"";n+=r===F?o+O:c>=0?(i.push(a),o.slice(0,c)+E+o.slice(c)+A+h):o+A+(-2===c?t:h)}return[J(e,n+(e[o]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),i]};class ee{constructor({strings:e,_$litType$:t},o){let i;this.parts=[];let s=0,n=0;const r=e.length-1,a=this.parts,[l,c]=Q(e,t);if(this.el=ee.createElement(l,o),Z.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(i=Z.nextNode())&&a.length<r;){if(1===i.nodeType){if(i.hasAttributes())for(const e of i.getAttributeNames())if(e.endsWith(E)){const t=c[n++],o=i.getAttribute(e).split(A),r=/([.?@])?(.*)/.exec(t);a.push({type:1,index:s,name:r[2],strings:o,ctor:"."===r[1]?ne:"?"===r[1]?re:"@"===r[1]?ae:se}),i.removeAttribute(e)}else e.startsWith(A)&&(a.push({type:6,index:s}),i.removeAttribute(e));if(U.test(i.tagName)){const e=i.textContent.split(A),t=e.length-1;if(t>0){i.textContent=$?$.emptyScript:"";for(let o=0;o<t;o++)i.append(e[o],B()),Z.nextNode(),a.push({type:2,index:++s});i.append(e[t],B())}}}else if(8===i.nodeType)if(i.data===P)a.push({type:2,index:s});else{let e=-1;for(;-1!==(e=i.data.indexOf(A,e+1));)a.push({type:7,index:s}),e+=A.length-1}s++}}static createElement(e,t){const o=R.createElement("template");return o.innerHTML=e,o}}function te(e,t,o=e,i){if(t===G)return t;let s=void 0!==i?o._$Co?.[i]:o._$Cl;const n=z(t)?void 0:t._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),void 0===n?s=void 0:(s=new n(e),s._$AT(e,o,i)),void 0!==i?(o._$Co??=[])[i]=s:o._$Cl=s),void 0!==s&&(t=te(e,s._$AS(e,t.values),s,i)),t}class oe{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:o}=this._$AD,i=(e?.creationScope??R).importNode(t,!0);Z.currentNode=i;let s=Z.nextNode(),n=0,r=0,a=o[0];for(;void 0!==a;){if(n===a.index){let t;2===a.type?t=new ie(s,s.nextSibling,this,e):1===a.type?t=new a.ctor(s,a.name,a.strings,this,e):6===a.type&&(t=new le(s,this,e)),this._$AV.push(t),a=o[++r]}n!==a?.index&&(s=Z.nextNode(),n++)}return Z.currentNode=R,i}p(e){let t=0;for(const o of this._$AV)void 0!==o&&(void 0!==o.strings?(o._$AI(e,o,t),t+=o.strings.length-2):o._$AI(e[t])),t++}}class ie{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,o,i){this.type=2,this._$AH=Y,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=o,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=te(this,e,t),z(e)?e===Y||null==e||""===e?(this._$AH!==Y&&this._$AR(),this._$AH=Y):e!==this._$AH&&e!==G&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):V(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==Y&&z(this._$AH)?this._$AA.nextSibling.data=e:this.T(R.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:o}=e,i="number"==typeof o?this._$AC(e):(void 0===o.el&&(o.el=ee.createElement(J(o.h,o.h[0]),this.options)),o);if(this._$AH?._$AD===i)this._$AH.p(t);else{const e=new oe(i,this),o=e.u(this.options);e.p(t),this.T(o),this._$AH=e}}_$AC(e){let t=X.get(e.strings);return void 0===t&&X.set(e.strings,t=new ee(e)),t}k(e){D(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let o,i=0;for(const s of e)i===t.length?t.push(o=new ie(this.O(B()),this.O(B()),this,this.options)):o=t[i],o._$AI(s),i++;i<t.length&&(this._$AR(o&&o._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=S(e).nextSibling;S(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class se{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,o,i,s){this.type=1,this._$AH=Y,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=s,o.length>2||""!==o[0]||""!==o[1]?(this._$AH=Array(o.length-1).fill(new String),this.strings=o):this._$AH=Y}_$AI(e,t=this,o,i){const s=this.strings;let n=!1;if(void 0===s)e=te(this,e,t,0),n=!z(e)||e!==this._$AH&&e!==G,n&&(this._$AH=e);else{const i=e;let r,a;for(e=s[0],r=0;r<s.length-1;r++)a=te(this,i[o+r],t,r),a===G&&(a=this._$AH[r]),n||=!z(a)||a!==this._$AH[r],a===Y?e=Y:e!==Y&&(e+=(a??"")+s[r+1]),this._$AH[r]=a}n&&!i&&this.j(e)}j(e){e===Y?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class ne extends se{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===Y?void 0:e}}class re extends se{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==Y)}}class ae extends se{constructor(e,t,o,i,s){super(e,t,o,i,s),this.type=5}_$AI(e,t=this){if((e=te(this,e,t,0)??Y)===G)return;const o=this._$AH,i=e===Y&&o!==Y||e.capture!==o.capture||e.once!==o.once||e.passive!==o.passive,s=e!==Y&&(o===Y||i);i&&this.element.removeEventListener(this.name,this,o),s&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class le{constructor(e,t,o){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=o}get _$AU(){return this._$AM._$AU}_$AI(e){te(this,e)}}const ce={M:E,P:A,A:P,C:1,L:Q,R:oe,D:V,V:te,I:ie,H:se,N:re,U:ae,B:ne,F:le},de=C.litHtmlPolyfillSupport;de?.(ee,ie),(C.litHtmlVersions??=[]).push("3.3.3");const he=(e,t,o)=>{const i=o?.renderBefore??t;let s=i._$litPart$;if(void 0===s){const e=o?.renderBefore??null;i._$litPart$=s=new ie(t.insertBefore(B(),e),e,void 0,o??{})}return s._$AI(e),s},pe=globalThis;class ue extends k{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=he(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return G}}ue._$litElement$=!0,ue.finalized=!0,pe.litElementHydrateSupport?.({LitElement:ue});const ve=pe.litElementPolyfillSupport;ve?.({LitElement:ue}),(pe.litElementVersions??=[]).push("4.2.2");const be={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:x},fe=(e=be,t,o)=>{const{kind:i,metadata:s}=o;let n=globalThis.litPropertyMetadata.get(s);if(void 0===n&&globalThis.litPropertyMetadata.set(s,n=new Map),"setter"===i&&((e=Object.create(e)).wrapped=!0),n.set(o.name,e),"accessor"===i){const{name:i}=o;return{set(o){const s=t.get.call(this);t.set.call(this,o),this.requestUpdate(i,s,e,!0,o)},init(t){return void 0!==t&&this.C(i,void 0,e,t),t}}}if("setter"===i){const{name:i}=o;return function(o){const s=this[i];t.call(this,o),this.requestUpdate(i,s,e,!0,o)}}throw Error("Unsupported decorator location: "+i)};function ge(e){return(t,o)=>"object"==typeof o?fe(e,t,o):((e,t,o)=>{const i=t.hasOwnProperty(o);return t.constructor.createProperty(o,e),i?Object.getOwnPropertyDescriptor(t,o):void 0})(e,t,o)}function _e(e){return ge({...e,state:!0,attribute:!1})}const me=(e,t,o)=>(o.configurable=!0,o.enumerable=!0,Reflect.decorate&&"object"!=typeof t&&Object.defineProperty(e,t,o),o);function ye(e,t){return(o,i,s)=>{const n=t=>t.renderRoot?.querySelector(e)??null;if(t){const{get:e,set:t}="object"==typeof i?o:s??(()=>{const e=Symbol();return{get(){return this[e]},set(t){this[e]=t}}})();return me(o,i,{get(){let o=e.call(this);return void 0===o&&(o=n(this),(null!==o||this.hasUpdated)&&t.call(this,o)),o}})}return me(o,i,{get(){return n(this)}})}}let xe;function we(e){return(t,o)=>{const{slot:i,selector:s}=e??{},n="slot"+(i?`[name=${i}]`:":not([name])");return me(t,o,{get(){const t=this.renderRoot?.querySelector(n),o=t?.assignedElements(e)??[];return void 0===s?o:o.filter(e=>e.matches(s))}})}}const ke="2.5.1",Ce="__vscodeElements_disableRegistryWarning__",Se=(e,t)=>{t?console.warn(`[VSCode Elements] ${e}\n%o`,t):console.warn(`${e}\n%o`,t)};class $e extends ue{get version(){return ke}warn(e){Se(e,this)}}const Ie=e=>t=>{if(!customElements.get(e))return void customElements.define(e,t);if(Ce in window)return;const o=document.createElement(e),i=o?.version;let s="";i?i!==ke?(s+="is already registered by a different version of VSCode Elements. ",s+=`This version is "${ke}", while the other one is "${i}".`):s+=`is already registered by the same version of VSCode Elements (${ke}).`:s+="is already registered by an unknown custom element handler class.",Se(`The custom element "${e}" ${s}\nTo suppress this warning, set window.${Ce} to true`)},Ee=r`
  :host([hidden]) {
    display: none;
  }

  :host([disabled]),
  :host(:disabled) {
    cursor: not-allowed;
    opacity: 0.4;
    pointer-events: none;
  }
`;function Ae(){return navigator.userAgent.indexOf("Linux")>-1?'system-ui, "Ubuntu", "Droid Sans", sans-serif':navigator.userAgent.indexOf("Mac")>-1?"-apple-system, BlinkMacSystemFont, sans-serif":navigator.userAgent.indexOf("Windows")>-1?'"Segoe WPC", "Segoe UI", sans-serif':"sans-serif"}const Pe=[Ee,r`
    :host {
      display: inline-block;
    }

    .root {
      background-color: var(--vscode-badge-background, #616161);
      border: 1px solid var(--vscode-contrastBorder, transparent);
      border-radius: 2px;
      box-sizing: border-box;
      color: var(--vscode-badge-foreground, #f8f8f8);
      display: block;
      font-family: var(--vscode-font-family, ${n(Ae())});
      font-size: 11px;
      font-weight: 400;
      line-height: 14px;
      min-width: 18px;
      padding: 2px 3px;
      text-align: center;
      white-space: nowrap;
    }

    :host([variant='counter']) .root {
      border-radius: 11px;
      line-height: 11px;
      min-height: 18px;
      min-width: 18px;
      padding: 3px 6px;
    }

    :host([variant='activity-bar-counter']) .root {
      background-color: var(--vscode-activityBarBadge-background, #0078d4);
      border-radius: 20px;
      color: var(--vscode-activityBarBadge-foreground, #ffffff);
      font-size: 9px;
      font-weight: 600;
      line-height: 16px;
      padding: 0 4px;
    }

    :host([variant='tab-header-counter']) .root {
      background-color: var(--vscode-activityBarBadge-background, #0078d4);
      border-radius: 10px;
      color: var(--vscode-activityBarBadge-foreground, #ffffff);
      line-height: 10px;
      min-height: 16px;
      min-width: 16px;
      padding: 3px 5px;
    }
  `];var Oe=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Re=class extends $e{constructor(){super(...arguments),this.variant="default"}render(){return W`<div class="root"><slot></slot></div>`}};Re.styles=Pe,Oe([ge({reflect:!0})],Re.prototype,"variant",void 0),Re=Oe([Ie("vscode-badge")],Re);const Be=e=>(...t)=>({_$litDirective$:e,values:t});class ze{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,o){this._$Ct=e,this._$AM=t,this._$Ci=o}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}}const De=Be(class extends ze{constructor(e){if(super(e),1!==e.type||"class"!==e.name||e.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){if(void 0===this.st){this.st=new Set,void 0!==e.strings&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(e=>""!==e)));for(const e in t)t[e]&&!this.nt?.has(e)&&this.st.add(e);return this.render(t)}const o=e.element.classList;for(const e of this.st)e in t||(o.remove(e),this.st.delete(e));for(const e in t){const i=!!t[e];i===this.st.has(e)||this.nt?.has(e)||(i?(o.add(e),this.st.add(e)):(o.remove(e),this.st.delete(e)))}return G}}),Ve=e=>e??Y,Le=Be(class extends ze{constructor(e){if(super(e),this._prevProperties={},3!==e.type||"style"!==e.name)throw new Error("The `stylePropertyMap` directive must be used in the `style` property")}update(e,[t]){return Object.entries(t).forEach(([t,o])=>{this._prevProperties[t]!==o&&(t.startsWith("--")?e.element.style.setProperty(t,o):e.element.style[t]=o,this._prevProperties[t]=o)}),G}render(e){return G}}),Fe=[Ee,r`
    :host {
      color: var(--vscode-icon-foreground, #cccccc);
      display: inline-block;
    }

    .codicon[class*='codicon-'] {
      display: block;
    }

    .icon,
    .button {
      background-color: transparent;
      display: block;
      padding: 0;
    }

    .button {
      border-color: transparent;
      border-style: solid;
      border-width: 1px;
      border-radius: 5px;
      color: currentColor;
      cursor: pointer;
      padding: 2px;
    }

    .button:hover {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
    }

    .button:active {
      background-color: var(
        --vscode-toolbar-activeBackground,
        rgba(99, 102, 103, 0.31)
      );
    }

    .button:focus {
      outline: none;
    }

    .button:focus-visible {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    @keyframes icon-spin {
      100% {
        transform: rotate(360deg);
      }
    }

    .spin {
      animation-name: icon-spin;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
  `];var Me,Te=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let He=Me=class extends $e{constructor(){super(...arguments),this.label="",this.name="",this.size=16,this.spin=!1,this.spinDuration=1.5,this.actionIcon=!1,this._onButtonClick=e=>{this.dispatchEvent(new CustomEvent("vsc-click",{detail:{originalEvent:e}}))}}connectedCallback(){super.connectedCallback();const{href:e,nonce:t}=this._getStylesheetConfig();Me.stylesheetHref=e,Me.nonce=t}_getStylesheetConfig(){if("undefined"==typeof document)return{nonce:void 0,href:void 0};const e=document.getElementById("vscode-codicon-stylesheet"),t=e?.getAttribute("href")||void 0,o=e?.nonce||void 0;if(!e){let e='To use the Icon component, the codicons.css file must be included in the page with the id "vscode-codicon-stylesheet"! ';e+="See https://vscode-elements.github.io/components/icon/ for more details.",this.warn(e)}return{nonce:o,href:t}}render(){const{stylesheetHref:e,nonce:t}=Me,o=W`<span
      class=${De({codicon:!0,["codicon-"+this.name]:!0,spin:this.spin})}
      .style=${Le({animationDuration:String(this.spinDuration)+"s",fontSize:this.size+"px",height:this.size+"px",width:this.size+"px"})}
    ></span>`,i=this.actionIcon?W` <button
          class="button"
          @click=${this._onButtonClick}
          aria-label=${this.label}
        >
          ${o}
        </button>`:W` <span class="icon" aria-hidden="true" role="presentation"
          >${o}</span
        >`;return W`
      <link
        rel="stylesheet"
        href=${Ve(e)}
        nonce=${Ve(t)}
      />
      ${i}
    `}};He.styles=Fe,He.stylesheetHref="",He.nonce="",Te([ge()],He.prototype,"label",void 0),Te([ge({type:String})],He.prototype,"name",void 0),Te([ge({type:Number})],He.prototype,"size",void 0),Te([ge({type:Boolean,reflect:!0})],He.prototype,"spin",void 0),Te([ge({type:Number,attribute:"spin-duration"})],He.prototype,"spinDuration",void 0),Te([ge({type:Boolean,reflect:!0,attribute:"action-icon"})],He.prototype,"actionIcon",void 0),He=Me=Te([Ie("vscode-icon")],He);const je=[Ee,r`
    :host {
      cursor: pointer;
      display: inline-block;
      width: auto;
    }

    :host([block]) {
      display: block;
      width: 100%;
    }

    .base {
      align-items: center;
      background-color: var(--vscode-button-background, #0078d4);
      border-bottom-left-radius: var(--vsc-border-left-radius, 4px);
      border-bottom-right-radius: var(--vsc-border-right-radius, 4px);
      border-bottom-width: 1px;
      border-color: var(--vscode-button-border, transparent);
      border-left-width: var(--vsc-border-left-width, 1px);
      border-right-width: var(--vsc-border-right-width, 1px);
      border-style: solid;
      border-top-left-radius: var(--vsc-border-left-radius, 4px);
      border-top-right-radius: var(--vsc-border-right-radius, 4px);
      border-top-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-button-foreground, #ffffff);
      display: flex;
      font-family: var(--vscode-font-family, ${n(Ae())});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      height: 100%;
      justify-content: center;
      line-height: 22px;
      overflow: hidden;
      padding: 1px calc(13px + var(--vsc-base-additional-right-padding, 0px))
        1px 13px;
      position: relative;
      user-select: none;
      white-space: nowrap;
      width: 100%;
    }

    :host([block]) .base {
      min-height: 28px;
      text-align: center;
      width: 100%;
    }

    .base:after {
      background-color: var(
        --vscode-button-separator,
        rgba(255, 255, 255, 0.4)
      );
      content: var(--vsc-base-after-content);
      display: var(--vsc-divider-display, none);
      position: absolute;
      right: 0;
      top: 4px;
      bottom: 4px;
      width: 1px;
    }

    :host([secondary]) .base:after {
      background-color: var(--vscode-button-secondaryForeground, #cccccc);
      opacity: 0.4;
    }

    :host([secondary]) .base {
      color: var(--vscode-button-secondaryForeground, #cccccc);
      background-color: var(--vscode-button-secondaryBackground, #313131);
      border-color: var(
        --vscode-button-border,
        var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.07))
      );
    }

    :host([disabled]) {
      cursor: default;
      opacity: 0.4;
      pointer-events: none;
    }

    :host(:hover) .base {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
    }

    :host([disabled]:hover) .base {
      background-color: var(--vscode-button-background, #0078d4);
    }

    :host([secondary]:hover) .base {
      background-color: var(--vscode-button-secondaryHoverBackground, #3c3c3c);
    }

    :host([secondary][disabled]:hover) .base {
      background-color: var(--vscode-button-secondaryBackground, #313131);
    }

    :host(:focus),
    :host(:active) {
      outline: none;
    }

    :host(:focus) .base {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: 2px;
    }

    :host([disabled]:focus) .base {
      background-color: var(--vscode-button-background, #0078d4);
      outline: 0;
    }

    :host([secondary]:focus) .base {
      background-color: var(--vscode-button-secondaryHoverBackground, #3c3c3c);
    }

    :host([secondary][disabled]:focus) .base {
      background-color: var(--vscode-button-secondaryBackground, #313131);
    }

    ::slotted(*) {
      display: inline-block;
      margin-left: 4px;
      margin-right: 4px;
    }

    ::slotted(*:first-child) {
      margin-left: 0;
    }

    ::slotted(*:last-child) {
      margin-right: 0;
    }

    ::slotted(vscode-icon) {
      color: inherit;
    }

    .content {
      display: flex;
      position: relative;
      width: 100%;
      height: 100%;
      padding: 1px 13px;
    }

    :host(:empty) .base,
    .base.icon-only {
      min-height: 24px;
      min-width: 26px;
      padding: 1px 4px;
    }

    slot {
      align-items: center;
      display: flex;
      height: 100%;
    }

    .has-content-before slot[name='content-before'] {
      margin-right: 4px;
    }

    .has-content-after slot[name='content-after'] {
      margin-left: 4px;
    }

    .icon,
    .icon-after {
      color: inherit;
      display: block;
    }

    :host(:not(:empty)) .icon {
      margin-right: 3px;
    }

    :host(:not(:empty)) .icon-after,
    :host([icon]) .icon-after {
      margin-left: 3px;
    }
  `];var qe=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Ue=class extends $e{get form(){return this._internals.form}constructor(){super(),this.autofocus=!1,this.tabIndex=0,this.secondary=!1,this.block=!1,this.role="button",this.disabled=!1,this.icon="",this.iconSpin=!1,this.iconAfter="",this.iconAfterSpin=!1,this.focused=!1,this.name=void 0,this.iconOnly=!1,this.type="button",this.value="",this._prevTabindex=0,this._hasContentBefore=!1,this._hasContentAfter=!1,this._handleFocus=()=>{this.focused=!0},this._handleBlur=()=>{this.focused=!1},this.addEventListener("keydown",this._handleKeyDown.bind(this)),this.addEventListener("click",this._handleClick.bind(this)),this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.autofocus&&(this.tabIndex<0&&(this.tabIndex=0),this.updateComplete.then(()=>{this.focus(),this.requestUpdate()})),this.addEventListener("focus",this._handleFocus),this.addEventListener("blur",this._handleBlur)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("focus",this._handleFocus),this.removeEventListener("blur",this._handleBlur)}update(e){super.update(e),e.has("value")&&this._internals.setFormValue(this.value),e.has("disabled")&&(this.disabled?(this._prevTabindex=this.tabIndex,this.tabIndex=-1):this.tabIndex=this._prevTabindex)}_executeAction(){"submit"===this.type&&this._internals.form&&this._internals.form.requestSubmit(),"reset"===this.type&&this._internals.form&&this._internals.form.reset()}_handleKeyDown(e){if(("Enter"===e.key||" "===e.key)&&!this.hasAttribute("disabled")){const e=new MouseEvent("click",{bubbles:!0,cancelable:!0});e.synthetic=!0,this.dispatchEvent(e),this._executeAction()}}_handleClick(e){e.synthetic||this.hasAttribute("disabled")||this._executeAction()}_handleSlotChange(e){const t=e.target;"content-before"===t.name&&(this._hasContentBefore=t.assignedElements().length>0),"content-after"===t.name&&(this._hasContentAfter=t.assignedElements().length>0)}render(){const e=""!==this.icon,t=""!==this.iconAfter,o={base:!0,"icon-only":this.iconOnly,"has-content-before":this._hasContentBefore,"has-content-after":this._hasContentAfter},i=e?W`<vscode-icon
          name=${this.icon}
          ?spin=${this.iconSpin}
          spin-duration=${Ve(this.iconSpinDuration)}
          class="icon"
        ></vscode-icon>`:Y,s=t?W`<vscode-icon
          name=${this.iconAfter}
          ?spin=${this.iconAfterSpin}
          spin-duration=${Ve(this.iconAfterSpinDuration)}
          class="icon-after"
        ></vscode-icon>`:Y;return W`
      <div
        class=${De(o)}
        part="base"
        @slotchange=${this._handleSlotChange}
      >
        <slot name="content-before"></slot>
        ${i}
        <slot></slot>
        ${s}
        <slot name="content-after"></slot>
      </div>
    `}};Ue.styles=je,Ue.formAssociated=!0,qe([ge({type:Boolean,reflect:!0})],Ue.prototype,"autofocus",void 0),qe([ge({type:Number,reflect:!0})],Ue.prototype,"tabIndex",void 0),qe([ge({type:Boolean,reflect:!0})],Ue.prototype,"secondary",void 0),qe([ge({type:Boolean,reflect:!0})],Ue.prototype,"block",void 0),qe([ge({reflect:!0})],Ue.prototype,"role",void 0),qe([ge({type:Boolean,reflect:!0})],Ue.prototype,"disabled",void 0),qe([ge()],Ue.prototype,"icon",void 0),qe([ge({type:Boolean,reflect:!0,attribute:"icon-spin"})],Ue.prototype,"iconSpin",void 0),qe([ge({type:Number,reflect:!0,attribute:"icon-spin-duration"})],Ue.prototype,"iconSpinDuration",void 0),qe([ge({attribute:"icon-after"})],Ue.prototype,"iconAfter",void 0),qe([ge({type:Boolean,reflect:!0,attribute:"icon-after-spin"})],Ue.prototype,"iconAfterSpin",void 0),qe([ge({type:Number,reflect:!0,attribute:"icon-after-spin-duration"})],Ue.prototype,"iconAfterSpinDuration",void 0),qe([ge({type:Boolean,reflect:!0})],Ue.prototype,"focused",void 0),qe([ge({type:String,reflect:!0})],Ue.prototype,"name",void 0),qe([ge({type:Boolean,reflect:!0,attribute:"icon-only"})],Ue.prototype,"iconOnly",void 0),qe([ge({reflect:!0})],Ue.prototype,"type",void 0),qe([ge()],Ue.prototype,"value",void 0),qe([_e()],Ue.prototype,"_hasContentBefore",void 0),qe([_e()],Ue.prototype,"_hasContentAfter",void 0),Ue=qe([Ie("vscode-button")],Ue);const Ne=[Ee,r`
    :host {
      display: inline-block;
    }

    .root {
      align-items: stretch;
      display: flex;
      width: 100%;
    }

    ::slotted(vscode-button:not(:first-child)) {
      --vsc-border-left-width: 0;
      --vsc-border-left-radius: 0;
      --vsc-border-left-width: 0;
    }

    ::slotted(vscode-button:not(:last-child)) {
      --vsc-divider-display: block;
      --vsc-base-additional-right-padding: 1px;
      --vsc-base-after-content: '';
      --vsc-border-right-width: 0;
      --vsc-border-right-radius: 0;
      --vsc-border-right-width: 0;
    }

    ::slotted(vscode-button:focus) {
      z-index: 1;
    }

    ::slotted(vscode-button:not(:empty)) {
      width: 100%;
    }
  `];let We=class extends $e{render(){return W`<div class="root"><slot></slot></div>`}};We.styles=Ne,We=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r}([Ie("vscode-button-group")],We);class Ke extends $e{constructor(){super(),this.focused=!1,this._prevTabindex=0,this._handleFocus=()=>{this.focused=!0},this._handleBlur=()=>{this.focused=!1}}connectedCallback(){super.connectedCallback(),this.addEventListener("focus",this._handleFocus),this.addEventListener("blur",this._handleBlur)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("focus",this._handleFocus),this.removeEventListener("blur",this._handleBlur)}attributeChangedCallback(e,t,o){super.attributeChangedCallback(e,t,o),"disabled"===e&&this.hasAttribute("disabled")?(this._prevTabindex=this.tabIndex,this.tabIndex=-1):"disabled"!==e||this.hasAttribute("disabled")||(this.tabIndex=this._prevTabindex)}}!function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);n>3&&r&&Object.defineProperty(t,o,r)}([ge({type:Boolean,reflect:!0})],Ke.prototype,"focused",void 0);const Ge=e=>{class t extends e{constructor(){super(...arguments),this._label="",this._slottedText=""}set label(e){this._label=e,""===this._slottedText&&this.setAttribute("aria-label",e)}get label(){return this._label}_handleSlotChange(){this._slottedText=this.textContent?this.textContent.trim():"",""!==this._slottedText&&this.setAttribute("aria-label",this._slottedText)}_renderLabelAttribute(){return""===this._slottedText?W`<span class="label-attr">${this._label}</span>`:W`${Y}`}}return function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);n>3&&r&&Object.defineProperty(t,o,r)}([ge()],t.prototype,"label",null),t},Ye=[r`
    :host {
      display: inline-block;
    }

    :host(:focus) {
      outline: none;
    }

    :host([disabled]) {
      opacity: 0.4;
    }

    .wrapper {
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
      margin-bottom: 4px;
      margin-top: 4px;
      min-height: 18px;
      position: relative;
      user-select: none;
    }

    :host([disabled]) .wrapper {
      cursor: default;
    }

    input {
      clip: rect(1px, 1px, 1px, 1px);
      height: 1px;
      left: 9px;
      margin: 0;
      overflow: hidden;
      position: absolute;
      top: 17px;
      white-space: nowrap;
      width: 1px;
    }

    .icon {
      align-items: center;
      background-color: var(--vscode-settings-checkboxBackground, #313131);
      background-size: 16px;
      border: 1px solid var(--vscode-settings-checkboxBorder, #3c3c3c);
      box-sizing: border-box;
      color: var(--vscode-settings-checkboxForeground, #cccccc);
      display: flex;
      height: 18px;
      justify-content: center;
      left: 0;
      margin-left: 0;
      margin-right: 9px;
      padding: 0;
      pointer-events: none;
      position: absolute;
      top: 0;
      width: 18px;
    }

    .icon.before-empty-label {
      margin-right: 0;
    }

    .label {
      cursor: pointer;
      display: block;
      min-height: 18px;
      min-width: 18px;
    }

    .label-inner {
      display: block;
      opacity: 0.9;
      padding-left: 27px;
    }

    .label-inner.empty {
      padding-left: 0;
    }

    :host([disabled]) .label {
      cursor: default;
    }
  `],Xe=[Ee,Ye,r`
    :host(:invalid) .icon,
    :host([invalid]) .icon {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .icon {
      border-radius: 3px;
    }

    .indeterminate-icon {
      background-color: currentColor;
      position: absolute;
      height: 1px;
      width: 12px;
    }

    :host(:focus):host(:not([disabled])) .icon {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }

    /* Toggle appearance */
    :host([toggle]) .icon {
      /* Track */
      width: 36px;
      height: 20px;
      border-radius: 999px;
      background-color: var(--vscode-button-secondaryBackground, #313131);
      border-color: var(--vscode-button-border, transparent);
      justify-content: flex-start;
      position: absolute;
    }

    :host(:focus):host([toggle]):host(:not([disabled])) .icon {
      outline-offset: 2px;
    }

    /* Reserve space for the wider toggle track so text doesn't overlap */
    :host([toggle]) .label-inner {
      padding-left: 45px; /* 36px track + 9px spacing */
    }

    :host([toggle]) .label {
      min-height: 20px;
    }

    :host([toggle]) .wrapper {
      min-height: 20px;
      line-height: 20px;
    }

    :host([toggle]) .thumb {
      /* Thumb */
      box-sizing: border-box;
      display: block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: var(--vscode-button-secondaryForeground, #cccccc);
      margin-left: 1px;
      transition: transform 120ms ease-in-out;
    }

    :host([toggle][checked]) .icon {
      background-color: var(--vscode-button-background, #04395e);
      border-color: var(--vscode-button-border, transparent);
    }

    :host([toggle][checked]) .thumb {
      transform: translateX(16px);
      background-color: var(--vscode-button-foreground, #ffffff);
    }

    :host([toggle]):host(:invalid) .icon {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    :host([toggle]):host(:invalid) .thumb {
      background-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    :host([toggle]) .check-icon,
    :host([toggle]) .indeterminate-icon {
      display: none;
    }

    :host([toggle]:focus):host(:not([disabled])) .icon {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }
  `];var Ze=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Je=class extends(Ge(Ke)){set checked(e){this._checked=e,this._manageRequired(),this.requestUpdate()}get checked(){return this._checked}set required(e){this._required=e,this._manageRequired(),this.requestUpdate()}get required(){return this._required}get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}constructor(){super(),this.autofocus=!1,this._checked=!1,this.defaultChecked=!1,this.invalid=!1,this.name=void 0,this.toggle=!1,this.value="",this.disabled=!1,this.indeterminate=!1,this._required=!1,this.type="checkbox",this._handleClick=e=>{e.preventDefault(),this.disabled||this._toggleState()},this._handleKeyDown=e=>{this.disabled||"Enter"!==e.key&&" "!==e.key||(e.preventDefault()," "===e.key&&this._toggleState(),"Enter"===e.key&&this._internals.form?.requestSubmit())},this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown),this.updateComplete.then(()=>{this._manageRequired(),this._setActualFormValue()})}disconnectedCallback(){this.removeEventListener("keydown",this._handleKeyDown)}formResetCallback(){this.checked=this.defaultChecked}formStateRestoreCallback(e,t){e&&(this.checked=!0)}_setActualFormValue(){let e="";e=this.checked?this.value?this.value:"on":null,this._internals.setFormValue(e)}_toggleState(){this.checked=!this.checked,this.indeterminate=!1,this._setActualFormValue(),this._manageRequired(),this.dispatchEvent(new Event("change",{bubbles:!0}))}_manageRequired(){!this.checked&&this.required?this._internals.setValidity({valueMissing:!0},"Please check this box if you want to proceed.",this._inputEl??void 0):this._internals.setValidity({})}render(){const e=De({icon:!0,checked:this.checked,indeterminate:this.indeterminate}),t=De({"label-inner":!0}),o=W`<svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      class="check-icon"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"
      />
    </svg>`,i=this.checked&&!this.indeterminate?o:Y,s=this.indeterminate?W`<span class="indeterminate-icon"></span>`:Y,n=this.toggle?W`<span class="thumb"></span>`:W`${s}${i}`;return W`
      <div class="wrapper">
        <input
          ?autofocus=${this.autofocus}
          id="input"
          class="checkbox"
          type="checkbox"
          ?checked=${this.checked}
          role=${Ve(this.toggle?"switch":void 0)}
          aria-checked=${Ve(this.toggle?this.checked?"true":"false":void 0)}
          value=${this.value}
        />
        <div class=${e}>${n}</div>
        <label for="input" class="label" @click=${this._handleClick}>
          <span class=${t}>
            ${this._renderLabelAttribute()}
            <slot @slotchange=${this._handleSlotChange}></slot>
          </span>
        </label>
      </div>
    `}};Je.styles=Xe,Je.formAssociated=!0,Je.shadowRootOptions={...ue.shadowRootOptions,delegatesFocus:!0},Ze([ge({type:Boolean,reflect:!0})],Je.prototype,"autofocus",void 0),Ze([ge({type:Boolean,reflect:!0})],Je.prototype,"checked",null),Ze([ge({type:Boolean,reflect:!0,attribute:"default-checked"})],Je.prototype,"defaultChecked",void 0),Ze([ge({type:Boolean,reflect:!0})],Je.prototype,"invalid",void 0),Ze([ge({reflect:!0})],Je.prototype,"name",void 0),Ze([ge({type:Boolean,reflect:!0})],Je.prototype,"toggle",void 0),Ze([ge()],Je.prototype,"value",void 0),Ze([ge({type:Boolean,reflect:!0})],Je.prototype,"disabled",void 0),Ze([ge({type:Boolean,reflect:!0})],Je.prototype,"indeterminate",void 0),Ze([ge({type:Boolean,reflect:!0})],Je.prototype,"required",null),Ze([ge()],Je.prototype,"type",void 0),Ze([ye("#input")],Je.prototype,"_inputEl",void 0),Je=Ze([Ie("vscode-checkbox")],Je);const Qe=[Ee,r`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper {
      display: block;
    }

    ::slotted(vscode-checkbox) {
      margin-right: 20px;
    }

    ::slotted(vscode-checkbox:last-child) {
      margin-right: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-checkbox) {
      display: block;
      margin-bottom: 15px;
    }

    :host([variant='vertical']) ::slotted(vscode-checkbox:last-child) {
      margin-bottom: 0;
    }
  `];var et=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let tt=class extends $e{constructor(){super(...arguments),this.role="group",this.variant="horizontal"}render(){return W`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};tt.styles=Qe,et([ge({reflect:!0})],tt.prototype,"role",void 0),et([ge({reflect:!0})],tt.prototype,"variant",void 0),tt=et([Ie("vscode-checkbox-group")],tt);const ot=[Ee,r`
    :host {
      display: block;
    }

    .collapsible {
      background-color: var(--vscode-sideBar-background, #181818);
    }

    .collapsible-header {
      align-items: center;
      background-color: var(--vscode-sideBarSectionHeader-background, #181818);
      cursor: pointer;
      display: flex;
      height: 22px;
      line-height: 22px;
      user-select: none;
    }

    .collapsible-header:focus {
      opacity: 1;
      outline-offset: -1px;
      outline-style: solid;
      outline-width: 1px;
      outline-color: var(--vscode-focusBorder, #0078d4);
    }

    .title {
      color: var(--vscode-sideBarTitle-foreground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 11px;
      font-weight: 700;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .title .description {
      font-weight: 400;
      margin-left: 10px;
      text-transform: none;
      opacity: 0.6;
    }

    .header-icon {
      color: var(--vscode-icon-foreground, #cccccc);
      display: block;
      flex-shrink: 0;
      margin: 0 3px;
    }

    .collapsible.open .header-icon {
      transform: rotate(90deg);
    }

    .header-slots {
      align-items: center;
      display: flex;
      height: 22px;
      margin-left: auto;
      margin-right: 4px;
    }

    .actions {
      display: none;
    }

    .collapsible.open .actions.always-visible,
    .collapsible.open:hover .actions {
      display: block;
    }

    .header-slots slot {
      display: flex;
      max-height: 22px;
      overflow: hidden;
    }

    .header-slots slot::slotted(div) {
      align-items: center;
      display: flex;
    }

    .collapsible-body {
      display: none;
      overflow: hidden;
    }

    .collapsible.open .collapsible-body {
      display: block;
    }
  `];var it=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let st=class extends $e{constructor(){super(...arguments),this.alwaysShowHeaderActions=!1,this.title="",this.heading="",this.description="",this.open=!1}_emitToggleEvent(){this.dispatchEvent(new CustomEvent("vsc-collapsible-toggle",{detail:{open:this.open}}))}_onHeaderClick(){this.open=!this.open,this._emitToggleEvent()}_onHeaderKeyDown(e){"Enter"===e.key&&(this.open=!this.open,this._emitToggleEvent())}_onHeaderSlotClick(e){e.stopPropagation()}render(){const e={collapsible:!0,open:this.open},t={actions:!0,"always-visible":this.alwaysShowHeaderActions},o=this.heading?this.heading:this.title,i=W`<svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      class="header-icon"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619 4.357-4.357z"
      />
    </svg>`,s=this.description?W`<span class="description">${this.description}</span>`:Y;return W`
      <div class=${De(e)}>
        <div
          class="collapsible-header"
          tabindex="0"
          @click=${this._onHeaderClick}
          @keydown=${this._onHeaderKeyDown}
        >
          ${i}
          <h3 class="title">${o}${s}</h3>
          <div class="header-slots">
            <div class=${De(t)}>
              <slot name="actions" @click=${this._onHeaderSlotClick}></slot>
            </div>
            <div class="decorations">
              <slot name="decorations" @click=${this._onHeaderSlotClick}></slot>
            </div>
          </div>
        </div>
        <div class="collapsible-body" part="body">
          <slot></slot>
        </div>
      </div>
    `}};st.styles=ot,it([ge({type:Boolean,reflect:!0,attribute:"always-show-header-actions"})],st.prototype,"alwaysShowHeaderActions",void 0),it([ge({type:String})],st.prototype,"title",void 0),it([ge()],st.prototype,"heading",void 0),it([ge()],st.prototype,"description",void 0),it([ge({type:Boolean,reflect:!0})],st.prototype,"open",void 0),st=it([Ie("vscode-collapsible")],st);const nt=[Ee,r`
    :host {
      display: block;
      outline: none;
      position: relative;
    }

    .context-menu-item {
      background-color: var(--vscode-menu-background, #1f1f1f);
      color: var(--vscode-menu-foreground, #cccccc);
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.4em;
      user-select: none;
      white-space: nowrap;
    }

    .ruler {
      border-bottom: 1px solid var(--vscode-menu-separatorBackground, #454545);
      display: block;
      margin: 0 0 4px;
      padding-top: 4px;
      width: 100%;
    }

    .context-menu-item a {
      align-items: center;
      border-color: transparent;
      border-radius: 3px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-menu-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      flex: 1 1 auto;
      height: 2em;
      margin-left: 4px;
      margin-right: 4px;
      outline: none;
      position: relative;
      text-decoration: inherit;
    }

    :host([selected]) .context-menu-item a {
      background-color: var(--vscode-menu-selectionBackground, #0078d4);
      border-color: var(--vscode-menu-selectionBorder, transparent);
      color: var(--vscode-menu-selectionForeground, #ffffff);
    }

    .label {
      background: none;
      display: flex;
      flex: 1 1 auto;
      font-size: 12px;
      line-height: 1;
      padding: 0 22px;
      text-decoration: none;
    }

    .keybinding {
      display: block;
      flex: 2 1 auto;
      line-height: 1;
      padding: 0 22px;
      text-align: right;
    }
  `];var rt=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let at=class extends $e{constructor(){super(...arguments),this.label="",this.keybinding="",this.value="",this.separator=!1,this.tabindex=0}onItemClick(){this.dispatchEvent(new CustomEvent("vsc-click",{detail:{label:this.label,keybinding:this.keybinding,value:this.value||this.label,separator:this.separator,tabindex:this.tabindex},bubbles:!0,composed:!0}))}render(){return W`
      ${this.separator?W`
            <div class="context-menu-item separator">
              <span class="ruler"></span>
            </div>
          `:W`
            <div class="context-menu-item">
              <a @click=${this.onItemClick}>
                ${this.label?W`<span class="label">${this.label}</span>`:Y}
                ${this.keybinding?W`<span class="keybinding">${this.keybinding}</span>`:Y}
              </a>
            </div>
          `}
    `}};at.styles=nt,rt([ge({type:String})],at.prototype,"label",void 0),rt([ge({type:String})],at.prototype,"keybinding",void 0),rt([ge({type:String})],at.prototype,"value",void 0),rt([ge({type:Boolean,reflect:!0})],at.prototype,"separator",void 0),rt([ge({type:Number})],at.prototype,"tabindex",void 0),at=rt([Ie("vscode-context-menu-item")],at);const lt=[Ee,r`
    :host {
      display: block;
      position: relative;
    }

    .context-menu {
      background-color: var(--vscode-menu-background, #1f1f1f);
      border-color: var(--vscode-menu-border, #454545);
      border-radius: 5px;
      border-style: solid;
      border-width: 1px;
      box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36));
      color: var(--vscode-menu-foreground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.4em;
      padding: 4px 0;
      white-space: nowrap;
    }

    .context-menu:focus {
      outline: 0;
    }
  `];var ct=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let dt=class extends $e{set data(e){this._data=e;const t=[];e.forEach((e,o)=>{e.separator||t.push(o)}),this._clickableItemIndexes=t}get data(){return this._data}set show(e){this._show=e,this._selectedClickableItemIndex=-1,e&&this.updateComplete.then(()=>{this._wrapperEl&&this._wrapperEl.focus(),requestAnimationFrame(()=>{document.addEventListener("click",this._onClickOutsideBound,{once:!0})})})}get show(){return this._show}constructor(){super(),this.preventClose=!1,this.tabIndex=0,this._selectedClickableItemIndex=-1,this._show=!1,this._data=[],this._clickableItemIndexes=[],this._onClickOutsideBound=this._onClickOutside.bind(this),this.addEventListener("keydown",this._onKeyDown)}_onClickOutside(e){e.composedPath().includes(this)||(this.show=!1)}_onKeyDown(e){const{key:t}=e;switch("ArrowUp"!==t&&"ArrowDown"!==t&&"Escape"!==t&&"Enter"!==t||e.preventDefault(),t){case"ArrowUp":this._handleArrowUp();break;case"ArrowDown":this._handleArrowDown();break;case"Escape":this._handleEscape();break;case"Enter":this._handleEnter()}}_handleArrowUp(){0===this._selectedClickableItemIndex?this._selectedClickableItemIndex=this._clickableItemIndexes.length-1:this._selectedClickableItemIndex-=1}_handleArrowDown(){this._selectedClickableItemIndex+1<this._clickableItemIndexes.length?this._selectedClickableItemIndex+=1:this._selectedClickableItemIndex=0}_handleEscape(){this.show=!1,document.removeEventListener("click",this._onClickOutsideBound)}_dispatchSelectEvent(e){const{keybinding:t,label:o,value:i,separator:s,tabindex:n}=e;this.dispatchEvent(new CustomEvent("vsc-context-menu-select",{detail:{keybinding:t,label:o,separator:s,tabindex:n,value:i}}))}_handleEnter(){if(-1===this._selectedClickableItemIndex)return;const e=this._clickableItemIndexes[this._selectedClickableItemIndex],t=this._wrapperEl.querySelectorAll("vscode-context-menu-item")[e];this._dispatchSelectEvent(t),this.preventClose||(this.show=!1,document.removeEventListener("click",this._onClickOutsideBound))}_onItemClick(e){const t=e.currentTarget;this._dispatchSelectEvent(t),this.preventClose||(this.show=!1)}_onItemMouseOver(e){const t=e.target,o=t.dataset.index?+t.dataset.index:-1,i=this._clickableItemIndexes.findIndex(e=>e===o);-1!==i&&(this._selectedClickableItemIndex=i)}_onItemMouseOut(){this._selectedClickableItemIndex=-1}render(){if(!this._show)return W`${Y}`;const e=this._clickableItemIndexes[this._selectedClickableItemIndex];return W`
      <div class="context-menu" tabindex="0">
        ${this.data?this.data.map(({label:t="",keybinding:o="",value:i="",separator:s=!1,tabindex:n=0},r)=>W`
                <vscode-context-menu-item
                  label=${t}
                  keybinding=${o}
                  value=${i}
                  ?separator=${s}
                  ?selected=${r===e}
                  tabindex=${n}
                  @vsc-click=${this._onItemClick}
                  @mouseover=${this._onItemMouseOver}
                  @mouseout=${this._onItemMouseOut}
                  data-index=${r}
                ></vscode-context-menu-item>
              `):W`<slot></slot>`}
      </div>
    `}};dt.styles=lt,ct([ge({type:Array,attribute:!1})],dt.prototype,"data",null),ct([ge({type:Boolean,reflect:!0,attribute:"prevent-close"})],dt.prototype,"preventClose",void 0),ct([ge({type:Boolean,reflect:!0})],dt.prototype,"show",null),ct([ge({type:Number,reflect:!0})],dt.prototype,"tabIndex",void 0),ct([_e()],dt.prototype,"_selectedClickableItemIndex",void 0),ct([_e()],dt.prototype,"_show",void 0),ct([ye(".context-menu")],dt.prototype,"_wrapperEl",void 0),dt=ct([Ie("vscode-context-menu")],dt);const ht=[Ee,r`
    :host {
      display: block;
      margin-bottom: 10px;
      margin-top: 10px;
    }

    div {
      background-color: var(--vscode-foreground, #cccccc);
      height: 1px;
      opacity: 0.4;
    }
  `];var pt=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let ut=class extends $e{constructor(){super(...arguments),this.role="separator"}render(){return W`<div></div>`}};ut.styles=ht,pt([ge({reflect:!0})],ut.prototype,"role",void 0),ut=pt([Ie("vscode-divider")],ut);const vt=[Ee,r`
    :host {
      display: block;
      max-width: 727px;
    }
  `];var bt,ft=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};!function(e){e.HORIZONTAL="horizontal",e.VERTICAL="vertical"}(bt||(bt={}));let gt=class extends $e{constructor(){super(...arguments),this.breakpoint=490,this._responsive=!1,this._firstUpdateComplete=!1,this._resizeObserverCallbackBound=this._resizeObserverCallback.bind(this)}set responsive(e){this._responsive=e,this._firstUpdateComplete&&(e?this._activateResponsiveLayout():this._deactivateResizeObserver())}get responsive(){return this._responsive}_toggleCompactLayout(e){this._assignedFormGroups.forEach(t=>{t.dataset.originalVariant||(t.dataset.originalVariant=t.variant);const o=t.dataset.originalVariant;e===bt.VERTICAL&&"horizontal"===o?t.variant="vertical":t.variant=o,t.querySelectorAll("vscode-checkbox-group, vscode-radio-group").forEach(t=>{t.dataset.originalVariant||(t.dataset.originalVariant=t.variant);const o=t.dataset.originalVariant;e===bt.HORIZONTAL&&o===bt.HORIZONTAL?t.variant="horizontal":t.variant="vertical"})})}_resizeObserverCallback(e){let t=0;for(const o of e)t=o.contentRect.width;const o=t<this.breakpoint?bt.VERTICAL:bt.HORIZONTAL;o!==this._currentFormGroupLayout&&(this._toggleCompactLayout(o),this._currentFormGroupLayout=o)}_activateResponsiveLayout(){this._resizeObserver=new ResizeObserver(this._resizeObserverCallbackBound),this._resizeObserver.observe(this._wrapperElement)}_deactivateResizeObserver(){this._resizeObserver?.disconnect(),this._resizeObserver=null}firstUpdated(){this._firstUpdateComplete=!0,this._responsive&&this._activateResponsiveLayout()}render(){return W`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};gt.styles=vt,ft([ge({type:Boolean,reflect:!0})],gt.prototype,"responsive",null),ft([ge({type:Number})],gt.prototype,"breakpoint",void 0),ft([ye(".wrapper")],gt.prototype,"_wrapperElement",void 0),ft([we({selector:"vscode-form-group"})],gt.prototype,"_assignedFormGroups",void 0),gt=ft([Ie("vscode-form-container")],gt);const _t=[Ee,r`
    :host {
      --label-right-margin: 14px;
      --label-width: 150px;

      display: block;
      margin: 15px 0;
    }

    :host([variant='settings-group']) {
      margin: 0;
      padding: 12px 14px 18px;
      max-width: 727px;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper,
    :host([variant='settings-group']) .wrapper {
      display: block;
    }

    :host([variant='horizontal']) ::slotted(vscode-checkbox-group),
    :host([variant='horizontal']) ::slotted(vscode-radio-group) {
      width: calc(100% - calc(var(--label-width) + var(--label-right-margin)));
    }

    :host([variant='horizontal']) ::slotted(vscode-label) {
      margin-right: var(--label-right-margin);
      text-align: right;
      width: var(--label-width);
    }

    :host([variant='settings-group']) ::slotted(vscode-label) {
      height: 18px;
      line-height: 18px;
      margin-bottom: 4px;
      margin-right: 0;
      padding: 0;
    }

    ::slotted(vscode-form-helper) {
      margin-left: calc(var(--label-width) + var(--label-right-margin));
    }

    :host([variant='vertical']) ::slotted(vscode-form-helper),
    :host([variant='settings-group']) ::slotted(vscode-form-helper) {
      display: block;
      margin-left: 0;
    }

    :host([variant='settings-group']) ::slotted(vscode-form-helper) {
      margin-bottom: 0;
      margin-top: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-label),
    :host([variant='settings-group']) ::slotted(vscode-label) {
      display: block;
      margin-left: 0;
      text-align: left;
    }

    :host([variant='settings-group']) ::slotted(vscode-inputbox),
    :host([variant='settings-group']) ::slotted(vscode-textfield),
    :host([variant='settings-group']) ::slotted(vscode-textarea),
    :host([variant='settings-group']) ::slotted(vscode-single-select),
    :host([variant='settings-group']) ::slotted(vscode-multi-select) {
      margin-top: 9px;
    }

    ::slotted(vscode-button:first-child) {
      margin-left: calc(var(--label-width) + var(--label-right-margin));
    }

    :host([variant='vertical']) ::slotted(vscode-button) {
      margin-left: 0;
    }

    ::slotted(vscode-button) {
      margin-right: 4px;
    }
  `];var mt=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let yt=class extends $e{constructor(){super(...arguments),this.variant="horizontal"}render(){return W`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};yt.styles=_t,mt([ge({reflect:!0})],yt.prototype,"variant",void 0),yt=mt([Ie("vscode-form-group")],yt);const xt=[Ee,r`
    :host {
      display: block;
      line-height: 1.4em;
      margin-bottom: 4px;
      margin-top: 4px;
      max-width: 720px;
      opacity: 0.9;
    }

    :host([vertical]) {
      margin-left: 0;
    }
  `];let wt;"undefined"!=typeof CSSStyleSheet&&(wt=new CSSStyleSheet,wt.replaceSync("\n    vscode-form-helper * {\n      margin: 0;\n    }\n\n    vscode-form-helper *:not(:last-child) {\n      margin-bottom: 8px;\n    }\n  "));let kt=class extends $e{constructor(){super(),this._injectLightDOMStyles()}_injectLightDOMStyles(){if("undefined"==typeof document||!wt)return;const e=document.adoptedStyleSheets.find(e=>e===wt);e||document.adoptedStyleSheets.push(wt)}render(){return W`<slot></slot>`}};kt.styles=xt,kt=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r}([Ie("vscode-form-helper")],kt);let Ct=0;const St=(e="")=>(Ct++,`${e}${Ct}`),$t=[Ee,r`
    :host {
      display: block;
    }

    .wrapper {
      color: var(--vscode-foreground, #cccccc);
      cursor: default;
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: 600;
      line-height: ${16/13};
      padding: 5px 0;
    }

    .wrapper.required:after {
      content: ' *';
    }

    ::slotted(.normal) {
      font-weight: normal;
    }

    ::slotted(.lightened) {
      color: var(--vscode-foreground, #cccccc);
      opacity: 0.9;
    }
  `];var It=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Et=class extends $e{constructor(){super(...arguments),this.required=!1,this._id="",this._htmlFor="",this._connected=!1}set htmlFor(e){this._htmlFor=e,this.setAttribute("for",e),this._connected&&this._connectWithTarget()}get htmlFor(){return this._htmlFor}set id(e){this._id=e}get id(){return this._id}attributeChangedCallback(e,t,o){super.attributeChangedCallback(e,t,o)}connectedCallback(){super.connectedCallback(),this._connected=!0,""===this._id&&(this._id=St("vscode-label-"),this.setAttribute("id",this._id)),this._connectWithTarget()}_getTarget(){let e=null;if(this._htmlFor){const t=this.getRootNode({composed:!1});t&&(e=t.querySelector(`#${this._htmlFor}`))}return e}async _connectWithTarget(){await this.updateComplete;const e=this._getTarget();["vscode-radio-group","vscode-checkbox-group"].includes(e?.tagName.toLowerCase()??"")&&e.setAttribute("aria-labelledby",this._id);let t="";this.textContent&&(t=this.textContent.trim()),e&&"label"in e&&["vscode-textfield","vscode-textarea","vscode-single-select","vscode-multi-select"].includes(e?.tagName.toLowerCase()??"")&&(e.label=t)}_handleClick(){const e=this._getTarget();e&&"focus"in e&&e.focus()}render(){return W`
      <label
        class=${De({wrapper:!0,required:this.required})}
        @click=${this._handleClick}
        ><slot></slot
      ></label>
    `}};Et.styles=$t,It([ge({reflect:!0,attribute:"for"})],Et.prototype,"htmlFor",null),It([ge()],Et.prototype,"id",null),It([ge({type:Boolean,reflect:!0})],Et.prototype,"required",void 0),Et=It([Ie("vscode-label")],Et);const At=W`
  <span class="icon">
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"
      />
    </svg>
  </span>
`,Pt=K`<svg
  width="16"
  height="16"
  viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg"
  fill="currentColor"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"
  />
</svg>`,{I:Ot}=ce,Rt=e=>e,Bt=()=>document.createComment(""),zt=(e,t,o)=>{const i=e._$AA.parentNode,s=void 0===t?e._$AB:t._$AA;if(void 0===o){const t=i.insertBefore(Bt(),s),n=i.insertBefore(Bt(),s);o=new Ot(t,n,e,e.options)}else{const t=o._$AB.nextSibling,n=o._$AM,r=n!==e;if(r){let t;o._$AQ?.(e),o._$AM=e,void 0!==o._$AP&&(t=e._$AU)!==n._$AU&&o._$AP(t)}if(t!==s||r){let e=o._$AA;for(;e!==t;){const t=Rt(e).nextSibling;Rt(i).insertBefore(e,s),e=t}}}return o},Dt=(e,t,o=e)=>(e._$AI(t,o),e),Vt={},Lt=e=>{e._$AR(),e._$AA.remove()},Ft=(e,t,o)=>{const i=new Map;for(let s=t;s<=o;s++)i.set(e[s],s);return i},Mt=Be(class extends ze{constructor(e){if(super(e),2!==e.type)throw Error("repeat() can only be used in text expressions")}dt(e,t,o){let i;void 0===o?o=t:void 0!==t&&(i=t);const s=[],n=[];let r=0;for(const t of e)s[r]=i?i(t,r):r,n[r]=o(t,r),r++;return{values:n,keys:s}}render(e,t,o){return this.dt(e,t,o).values}update(e,[t,o,i]){const s=(e=>e._$AH)(e),{values:n,keys:r}=this.dt(t,o,i);if(!Array.isArray(s))return this.ut=r,n;const a=this.ut??=[],l=[];let c,d,h=0,p=s.length-1,u=0,v=n.length-1;for(;h<=p&&u<=v;)if(null===s[h])h++;else if(null===s[p])p--;else if(a[h]===r[u])l[u]=Dt(s[h],n[u]),h++,u++;else if(a[p]===r[v])l[v]=Dt(s[p],n[v]),p--,v--;else if(a[h]===r[v])l[v]=Dt(s[h],n[v]),zt(e,l[v+1],s[h]),h++,v--;else if(a[p]===r[u])l[u]=Dt(s[p],n[u]),zt(e,s[h],s[p]),p--,u++;else if(void 0===c&&(c=Ft(r,u,v),d=Ft(a,h,p)),c.has(a[h]))if(c.has(a[p])){const t=d.get(r[u]),o=void 0!==t?s[t]:null;if(null===o){const t=zt(e,s[h]);Dt(t,n[u]),l[u]=t}else l[u]=Dt(o,n[u]),zt(e,s[h],o),s[t]=null;u++}else Lt(s[p]),p--;else Lt(s[h]),h++;for(;u<=v;){const t=zt(e,l[v+1]);Dt(t,n[u]),l[u++]=t}for(;h<=p;){const e=s[h++];null!==e&&Lt(e)}return this.ut=r,((e,t=Vt)=>{e._$AH=t})(e,l),G}}),Tt=Ee;var Ht=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let jt=class extends $e{constructor(){super(...arguments),this.description="",this.selected=!1,this.disabled=!1,this._initialized=!1,this._handleSlotChange=()=>{this._initialized&&this.dispatchEvent(new Event("vsc-option-state-change",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._initialized=!0})}willUpdate(e){this._initialized&&(e.has("description")||e.has("value")||e.has("selected")||e.has("disabled"))&&this.dispatchEvent(new Event("vsc-option-state-change",{bubbles:!0}))}render(){return W`<slot @slotchange=${this._handleSlotChange}></slot>`}};jt.styles=Tt,Ht([ge({type:String})],jt.prototype,"value",void 0),Ht([ge({type:String})],jt.prototype,"description",void 0),Ht([ge({type:Boolean,reflect:!0})],jt.prototype,"selected",void 0),Ht([ge({type:Boolean,reflect:!0})],jt.prototype,"disabled",void 0),jt=Ht([Ie("vscode-option")],jt);const qt=(e,t)=>{const o={match:!1,ranges:[]},i=e.toLowerCase(),s=t.toLowerCase(),n=i.split(" ");let r=0;return n.forEach((t,i)=>{if(i>0&&(r+=n[i-1].length+1),o.match)return;const a=t.indexOf(s),l=s.length;0===a&&(o.match=!0,o.ranges.push([r+a,Math.min(r+a+l,e.length)]))}),o},Ut=(e,t)=>{const o={match:!1,ranges:[]};return 0===e.toLowerCase().indexOf(t.toLowerCase())&&(o.match=!0,o.ranges=[[0,t.length]]),o},Nt=(e,t)=>{const o={match:!1,ranges:[]},i=e.toLowerCase().indexOf(t.toLowerCase());return i>-1&&(o.match=!0,o.ranges=[[i,i+t.length]]),o},Wt=(e,t)=>{const o={match:!1,ranges:[]};let i=0,s=0;const n=t.length-1,r=e.toLowerCase(),a=t.toLowerCase();for(let e=0;e<=n;e++){if(s=r.indexOf(a[e],i),-1===s)return{match:!1,ranges:[]};o.match=!0,o.ranges.push([s,s+1]),i=s+1}return o},Kt=e=>{const t=[];return" "===e?(t.push(W`&nbsp;`),t):(0===e.indexOf(" ")&&t.push(W`&nbsp;`),t.push(W`${e.trimStart().trimEnd()}`),e.lastIndexOf(" ")===e.length-1&&t.push(W`&nbsp;`),t)};class Gt{constructor(e){this._activeIndex=-1,this._options=[],this._filterPattern="",this._filterMethod="fuzzy",this._combobox=!1,this._indexByValue=new Map,this._indexByLabel=new Map,this._selectedIndex=-1,this._selectedIndexes=new Set,this._multiSelect=!1,this._numOfVisibleOptions=0,(this._host=e).addController(this)}hostConnected(){}get activeIndex(){return this._activeIndex}set activeIndex(e){this._activeIndex=e,this._host.requestUpdate()}get relativeActiveIndex(){return this._options[this._activeIndex]?.filteredIndex??-1}set comboboxMode(e){this._combobox=e,this._host.requestUpdate()}get comboboxMode(){return this._combobox}get multiSelect(){return this._multiSelect}set multiSelect(e){this._selectedIndex=-1,this._selectedIndexes.clear(),this._multiSelect=e,this._host.requestUpdate()}get selectedIndex(){return this._selectedIndex}set selectedIndex(e){-1!==this._selectedIndex&&this._options[this._selectedIndex]&&(this._options[this._selectedIndex].selected??=!1);const t=this.getOptionByIndex(e);this._selectedIndex=t?e:-1,this._host.requestUpdate()}get selectedIndexes(){return Array.from(this._selectedIndexes)}set selectedIndexes(e){this._selectedIndexes.forEach(e=>{this._options[e].selected=!1}),this._selectedIndexes=new Set(e),e.forEach(e=>{void 0!==this._options[e]&&(this._options[e].selected=!0)}),this._host.requestUpdate()}set value(e){if(this._multiSelect){const t=e.map(e=>this._indexByValue.get(e)).filter(e=>void 0!==e);this._selectedIndexes=new Set(t)}else this._selectedIndex=this._indexByValue.get(e)??-1;this._host.requestUpdate()}get value(){return this._multiSelect?this._selectedIndexes.size>0?Array.from(this._selectedIndexes).filter(e=>e>=0&&e<this._options.length).map(e=>this._options[e].value):[]:this._selectedIndex>-1&&this._selectedIndex<this._options.length?this._options[this._selectedIndex].value:""}set multiSelectValue(e){const t=e.map(e=>this._indexByValue.get(e)).filter(e=>void 0!==e);this._selectedIndexes=new Set(t)}get multiSelectValue(){return this._selectedIndexes.size>0?Array.from(this._selectedIndexes).map(e=>this._options[e].value):[]}get filterPattern(){return this._filterPattern}set filterPattern(e){e!==this._filterPattern&&(this._filterPattern=e,this._updateState())}get filterMethod(){return this._filterMethod}set filterMethod(e){e!==this._filterMethod&&(this._filterMethod=e,this._updateState())}get options(){return this._options}get numOfVisibleOptions(){return this._numOfVisibleOptions}get numOptions(){return this._options.length}populate(e){this._indexByValue.clear(),this._indexByLabel.clear(),this._options=e.map((e,t)=>(this._indexByValue.set(e.value??"",t),this._indexByLabel.set(e.label??"",t),{description:e.description??"",disabled:e.disabled??!1,label:e.label??"",selected:e.selected??!1,value:e.value??"",index:t,filteredIndex:t,ranges:[],visible:!0})),this._numOfVisibleOptions=this._options.length}add(e){const t=this._options.length,{description:o,disabled:i,label:s,selected:n,value:r}=e;let a=!0,l=[];if(this._combobox&&""!==this._filterPattern){const e=this._searchByPattern(s??"");a=e.match,l=e.ranges}this._indexByValue.set(r??"",t),this._indexByLabel.set(s??"",t),n&&(this._selectedIndex=t,this._selectedIndexes.add(t),this._activeIndex=t),this._options.push({index:t,filteredIndex:t,description:o??"",disabled:i??!1,label:s??"",selected:n??!1,value:r??"",visible:a,ranges:l}),a&&(this._numOfVisibleOptions+=1)}clear(){this._options=[],this._indexByValue.clear(),this._indexByLabel.clear(),this._numOfVisibleOptions=0,this._selectedIndex=-1,this._selectedIndexes.clear(),this._activeIndex=-1}getIsIndexSelected(e){return this._multiSelect?this._selectedIndexes.has(e):this._selectedIndex===e}expandMultiSelection(e){e.forEach(e=>{const t=this._indexByValue.get(e)??-1;-1!==t&&this._selectedIndexes.add(t)}),this._host.requestUpdate()}toggleActiveMultiselectOption(){const e=this._options[this._activeIndex]??null;e&&(this._selectedIndexes.has(e.index)?this._selectedIndexes.delete(e.index):this._selectedIndexes.add(e.index),this._host.requestUpdate())}toggleOptionSelected(e){const t=this._selectedIndexes.has(e);this._options[e].selected=!this._options[e].selected,t?this._selectedIndexes.delete(e):this._selectedIndexes.add(e),this._host.requestUpdate()}getActiveOption(){return this._options[this._activeIndex]??null}getSelectedOption(){return this._options[this._selectedIndex]??null}getOptionByIndex(e){return this._options[e]??null}findOptionIndex(e){return this._indexByValue.get(e)??-1}getOptionByValue(e,t=!1){const o=this._indexByValue.get(e)??-1;return-1===o?null:t||this._options[o].visible?this._options[o]:null}getOptionByLabel(e){const t=this._indexByLabel.get(e)??-1;return-1===t?null:this._options[t]}next(e){let t=-1;for(let o=(e??this._activeIndex)+1;o<this._options.length;o++)if(this._options[o]&&!this._options[o].disabled&&this._options[o].visible){t=o;break}return t>-1?this._options[t]:null}prev(e){let t=-1;for(let o=(e??this._activeIndex)-1;o>=0;o--)if(this._options[o]&&!this._options[o].disabled&&this._options[o].visible){t=o;break}return t>-1?this._options[t]:null}activateDefault(){if(this._multiSelect){if(this._selectedIndexes.size>0){const e=this._selectedIndexes.values().next();this._activeIndex=e.value?e.value:0}}else this._selectedIndex>-1?this._activeIndex=this._selectedIndex:this._activeIndex=0;this._host.requestUpdate()}selectAll(){this._multiSelect&&(this._options.forEach((e,t)=>{this._options[t].selected=!0,this._selectedIndexes.add(t)}),this._host.requestUpdate())}selectNone(){this._multiSelect&&(this._options.forEach((e,t)=>{this._options[t].selected=!1}),this._selectedIndexes.clear(),this._host.requestUpdate())}_searchByPattern(e){let t;switch(this._filterMethod){case"startsWithPerTerm":t=qt(e,this._filterPattern);break;case"startsWith":t=Ut(e,this._filterPattern);break;case"contains":t=Nt(e,this._filterPattern);break;default:t=Wt(e,this._filterPattern)}return t}_updateState(){if(this._combobox&&""!==this._filterPattern){let e=-1;this._numOfVisibleOptions=0,this._options.forEach(({label:t},o)=>{const i=this._searchByPattern(t);this._options[o].visible=i.match,this._options[o].ranges=i.ranges,this._options[o].filteredIndex=i.match?++e:-1,i.match&&(this._numOfVisibleOptions+=1)})}else this._options.forEach((e,t)=>{this._options[t].visible=!0,this._options[t].ranges=[]}),this._numOfVisibleOptions=this._options.length;this._host.requestUpdate()}}const Yt=[Ee,r`
    :host {
      display: block;
      position: relative;
    }

    .scrollable-container {
      height: 100%;
      overflow: auto;
    }

    .scrollable-container::-webkit-scrollbar {
      cursor: default;
      width: 0;
    }

    .scrollable-container {
      scrollbar-width: none;
    }

    .shadow {
      box-shadow: var(--vscode-scrollbar-shadow, #000000) 0 6px 6px -6px inset;
      display: none;
      height: 3px;
      left: 0;
      pointer-events: none;
      position: absolute;
      top: 0;
      z-index: 1;
      width: 100%;
    }

    .shadow.visible {
      display: block;
    }

    .scrollbar-track {
      height: 100%;
      position: absolute;
      right: 0;
      top: 0;
      width: 10px;
      z-index: 100;
    }

    .scrollbar-track.hidden {
      display: none;
    }

    .scrollbar-thumb {
      background-color: transparent;
      min-height: var(--min-thumb-height, 20px);
      opacity: 0;
      position: absolute;
      right: 0;
      width: 10px;
    }

    .scrollbar-thumb.visible {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
      opacity: 1;
      transition: opacity 100ms;
    }

    .scrollbar-thumb.fade {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
      opacity: 0;
      transition: opacity 800ms;
    }

    .scrollbar-thumb.visible:hover {
      background-color: var(
        --vscode-scrollbarSlider-hoverBackground,
        rgba(100, 100, 100, 0.7)
      );
    }

    .scrollbar-thumb.visible.active,
    .scrollbar-thumb.visible.active:hover {
      background-color: var(
        --vscode-scrollbarSlider-activeBackground,
        rgba(191, 191, 191, 0.4)
      );
    }

    .prevent-interaction {
      bottom: 0;
      left: 0;
      right: 0;
      top: 0;
      position: absolute;
      z-index: 99;
    }

    .content {
      overflow: hidden;
    }
  `];var Xt=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Zt=class extends $e{set scrollPos(e){this._scrollPos=this._limitScrollPos(e),this._updateScrollbar(),this._updateThumbPosition(),this.requestUpdate()}get scrollPos(){return this._scrollPos}get scrollMax(){return this._scrollableContainer?this._scrollableContainer.scrollHeight-this._scrollableContainer.clientHeight:0}constructor(){super(),this.alwaysVisible=!1,this.fastScrollSensitivity=5,this.minThumbSize=20,this.mouseWheelScrollSensitivity=1,this.shadow=!0,this.scrolled=!1,this._scrollPos=0,this._isDragging=!1,this._thumbHeight=0,this._thumbY=0,this._thumbVisible=!1,this._thumbFade=!1,this._thumbActive=!1,this._componentHeight=0,this._contentHeight=0,this._scrollThumbStartY=0,this._mouseStartY=0,this._scrollbarVisible=!0,this._scrollbarTrackZ=0,this._resizeObserverCallback=()=>{this._componentHeight=this.offsetHeight,this._contentHeight=this._contentElement.offsetHeight,this._updateScrollbar(),this._updateThumbPosition()},this._handleSlotChange=()=>{this._updateScrollbar(),this._updateThumbPosition(),this._zIndexFix()},this._handleScrollThumbMouseMove=e=>{const t=this._scrollThumbStartY+(e.screenY-this._mouseStartY);this._thumbY=this._limitThumbPos(t),this.scrollPos=this._calculateScrollPosFromThumbPos(this._thumbY),this.dispatchEvent(new CustomEvent("vsc-scrollable-scroll",{detail:this.scrollPos}))},this._handleScrollThumbMouseUp=e=>{this._isDragging=!1,this._thumbActive=!1;const t=this.getBoundingClientRect(),{x:o,y:i,width:s,height:n}=t,{pageX:r,pageY:a}=e;(r>o+s||r<o||a>i+n||a<i)&&(this._thumbFade=!0,this._thumbVisible=!1),document.removeEventListener("mousemove",this._handleScrollThumbMouseMove),document.removeEventListener("mouseup",this._handleScrollThumbMouseUp)},this._handleComponentMouseOver=()=>{this._thumbVisible=!0,this._thumbFade=!1},this._handleComponentMouseOut=()=>{this._thumbActive||(this._thumbVisible=!1,this._thumbFade=!0)},this._handleComponentWheel=e=>{if(this._contentHeight<=this._componentHeight)return;e.preventDefault();const t=e.altKey?this.mouseWheelScrollSensitivity*this.fastScrollSensitivity:this.mouseWheelScrollSensitivity;this.scrollPos=this._limitScrollPos(this.scrollPos+e.deltaY*t),this.dispatchEvent(new CustomEvent("vsc-scrollable-scroll",{detail:this.scrollPos}))},this._handleScrollableContainerScroll=e=>{e.currentTarget&&(this.scrollPos=e.currentTarget.scrollTop)},this.addEventListener("mouseover",this._handleComponentMouseOver),this.addEventListener("mouseout",this._handleComponentMouseOut),this.addEventListener("wheel",this._handleComponentWheel)}connectedCallback(){super.connectedCallback(),this._hostResizeObserver=new ResizeObserver(this._resizeObserverCallback),this._contentResizeObserver=new ResizeObserver(this._resizeObserverCallback),this.requestUpdate(),this.updateComplete.then(()=>{this._hostResizeObserver.observe(this),this._contentResizeObserver.observe(this._contentElement),this._updateThumbPosition()})}disconnectedCallback(){super.disconnectedCallback(),this._hostResizeObserver.unobserve(this),this._hostResizeObserver.disconnect(),this._contentResizeObserver.unobserve(this._contentElement),this._contentResizeObserver.disconnect()}firstUpdated(e){this._updateThumbPosition()}_calcThumbHeight(){const e=this.offsetHeight,t=e*(e/(this._contentElement?.offsetHeight??0));return Math.max(this.minThumbSize,t)}_updateScrollbar(){const e=this._contentElement?.offsetHeight??0;this.offsetHeight>=e?this._scrollbarVisible=!1:(this._scrollbarVisible=!0,this._thumbHeight=this._calcThumbHeight()),this.requestUpdate()}_zIndexFix(){let e=0;this._assignedElements.forEach(t=>{if("style"in t){const o=window.getComputedStyle(t).zIndex;/([0-9-])+/g.test(o)&&(e=Number(o)>e?Number(o):e)}}),this._scrollbarTrackZ=e+1,this.requestUpdate()}_updateThumbPosition(){if(!this._scrollableContainer)return;this.scrolled=this.scrollPos>0;const e=this.offsetHeight,t=this._thumbHeight,o=this._contentElement.offsetHeight-e,i=this.scrollPos/o,s=e-t;this._thumbY=Math.min(i*(e-t),s)}_calculateScrollPosFromThumbPos(e){const t=this.getBoundingClientRect().height,o=e/(t-this._scrollThumbElement.getBoundingClientRect().height)*(this._contentElement.getBoundingClientRect().height-t);return this._limitScrollPos(o)}_limitScrollPos(e){return e<0?0:e>this.scrollMax?this.scrollMax:e}_limitThumbPos(e){const t=this.getBoundingClientRect().height,o=this._scrollThumbElement.getBoundingClientRect().height;return e<0?0:e>t-o?t-o:e}_handleScrollThumbMouseDown(e){const t=this.getBoundingClientRect(),o=this._scrollThumbElement.getBoundingClientRect();this._mouseStartY=e.screenY,this._scrollThumbStartY=o.top-t.top,this._isDragging=!0,this._thumbActive=!0,document.addEventListener("mousemove",this._handleScrollThumbMouseMove),document.addEventListener("mouseup",this._handleScrollThumbMouseUp)}_handleScrollbarTrackPress(e){e.target===e.currentTarget&&(this._thumbY=e.offsetY-this._thumbHeight/2,this.scrollPos=this._calculateScrollPosFromThumbPos(this._thumbY))}render(){return W`
      <div
        class="scrollable-container"
        .style=${Le({userSelect:this._isDragging?"none":"auto"})}
        .scrollTop=${this.scrollPos}
        @scroll=${this._handleScrollableContainerScroll}
      >
        <div
          class=${De({shadow:!0,visible:this.scrolled})}
          .style=${Le({zIndex:String(this._scrollbarTrackZ)})}
        ></div>
        ${this._isDragging?W`<div class="prevent-interaction"></div>`:Y}
        <div
          class=${De({"scrollbar-track":!0,hidden:!this._scrollbarVisible})}
          @mousedown=${this._handleScrollbarTrackPress}
        >
          <div
            class=${De({"scrollbar-thumb":!0,visible:!!this.alwaysVisible||this._thumbVisible,fade:!this.alwaysVisible&&this._thumbFade,active:this._thumbActive})}
            .style=${Le({height:`${this._thumbHeight}px`,top:`${this._thumbY}px`})}
            @mousedown=${this._handleScrollThumbMouseDown}
          ></div>
        </div>
        <div class="content">
          <slot @slotchange=${this._handleSlotChange}></slot>
        </div>
      </div>
    `}};Zt.styles=Yt,Xt([ge({type:Boolean,reflect:!0,attribute:"always-visible"})],Zt.prototype,"alwaysVisible",void 0),Xt([ge({type:Number,attribute:"fast-scroll-sensitivity"})],Zt.prototype,"fastScrollSensitivity",void 0),Xt([ge({type:Number,attribute:"min-thumb-size"})],Zt.prototype,"minThumbSize",void 0),Xt([ge({type:Number,attribute:"mouse-wheel-scroll-sensitivity"})],Zt.prototype,"mouseWheelScrollSensitivity",void 0),Xt([ge({type:Boolean,reflect:!0})],Zt.prototype,"shadow",void 0),Xt([ge({type:Boolean,reflect:!0})],Zt.prototype,"scrolled",void 0),Xt([ge({type:Number,attribute:"scroll-pos"})],Zt.prototype,"scrollPos",null),Xt([_e()],Zt.prototype,"_isDragging",void 0),Xt([_e()],Zt.prototype,"_thumbHeight",void 0),Xt([_e()],Zt.prototype,"_thumbY",void 0),Xt([_e()],Zt.prototype,"_thumbVisible",void 0),Xt([_e()],Zt.prototype,"_thumbFade",void 0),Xt([_e()],Zt.prototype,"_thumbActive",void 0),Xt([ye(".content")],Zt.prototype,"_contentElement",void 0),Xt([ye(".scrollbar-thumb",!0)],Zt.prototype,"_scrollThumbElement",void 0),Xt([ye(".scrollable-container")],Zt.prototype,"_scrollableContainer",void 0),Xt([we()],Zt.prototype,"_assignedElements",void 0),Zt=Xt([Ie("vscode-scrollable")],Zt);var Jt=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};const Qt=22;class eo extends $e{set combobox(e){this._opts.comboboxMode=e}get combobox(){return this._opts.comboboxMode}set disabled(e){this._disabled=e,this.ariaDisabled=e?"true":"false",!0===e?(this._originalTabIndex=this.tabIndex,this.tabIndex=-1):(this.tabIndex=this._originalTabIndex??0,this._originalTabIndex=void 0),this.requestUpdate()}get disabled(){return this._disabled}set filter(e){let t;["contains","fuzzy","startsWith","startsWithPerTerm"].includes(e)?t=e:(this.warn(`Invalid filter: "${e}", fallback to default. Valid values are: "contains", "fuzzy", "startsWith", "startsWithPerm".`),t="fuzzy"),this._opts.filterMethod=t}get filter(){return this._opts.filterMethod}set options(e){this._opts.populate(e)}get options(){return this._opts.options.map(({label:e,value:t,description:o,selected:i,disabled:s})=>({label:e,value:t,description:o,selected:i,disabled:s}))}constructor(){super(),this.creatable=!1,this.label="",this.invalid=!1,this.focused=!1,this.open=!1,this.position="below",this._prevXPos=0,this._prevYPos=0,this._opts=new Gt(this),this._firstUpdateCompleted=!1,this._currentDescription="",this._filter="fuzzy",this._selectedIndexes=[],this._options=[],this._value="",this._values=[],this._isPlaceholderOptionActive=!1,this._isBeingFiltered=!1,this._optionListScrollPos=0,this._isHoverForbidden=!1,this._disabled=!1,this._originalTabIndex=void 0,this._onMouseMove=()=>{this._isHoverForbidden=!1,window.removeEventListener("mousemove",this._onMouseMove)},this._onOptionListScroll=e=>{this._optionListScrollPos=e.detail},this._onComponentKeyDown=e=>{[" ","ArrowUp","ArrowDown","Escape"].includes(e.key)&&(e.stopPropagation(),e.preventDefault()),"Enter"===e.key&&this._onEnterKeyDown(e)," "===e.key&&this._onSpaceKeyDown(),"Escape"===e.key&&this._onEscapeKeyDown(),"ArrowUp"===e.key&&this._onArrowUpKeyDown(),"ArrowDown"===e.key&&this._onArrowDownKeyDown()},this._onComponentFocus=()=>{this.focused=!0},this._onComponentBlur=()=>{this.focused=!1},this._handleWindowScroll=()=>{const{x:e,y:t}=this.getBoundingClientRect();e===this._prevXPos&&t===this._prevYPos||(this.open=!1)},this.addEventListener("vsc-option-state-change",e=>{e.stopPropagation(),this._setStateFromSlottedElements(),this.requestUpdate()})}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._onComponentKeyDown),this.addEventListener("focus",this._onComponentFocus),this.addEventListener("blur",this._onComponentBlur),this._setAutoFocus()}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._onComponentKeyDown),this.removeEventListener("focus",this._onComponentFocus),this.removeEventListener("blur",this._onComponentBlur)}firstUpdated(e){this._firstUpdateCompleted=!0}willUpdate(e){if(e.has("required")&&this._firstUpdateCompleted&&this._manageRequired(),e.has("open")&&this._firstUpdateCompleted)if(this.open){this._dropdownEl.showPopover();const{x:e,y:t}=this.getBoundingClientRect();this._prevXPos=e,this._prevYPos=t,window.addEventListener("scroll",this._handleWindowScroll,{capture:!0}),this._opts.activateDefault(),this._scrollActiveElementToTop()}else this._dropdownEl.hidePopover(),window.removeEventListener("scroll",this._handleWindowScroll)}get _filteredOptions(){return this.combobox&&""!==this._opts.filterPattern?((e,t,o)=>{const i=[];return e.forEach(e=>{let s;switch(o){case"startsWithPerTerm":s=qt(e.label,t);break;case"startsWith":s=Ut(e.label,t);break;case"contains":s=Nt(e.label,t);break;default:s=Wt(e.label,t)}s.match&&i.push({...e,ranges:s.ranges})}),i})(this._options,this._opts.filterPattern,this._filter):this._options}_setAutoFocus(){this.hasAttribute("autofocus")&&(this.tabIndex<0&&(this.tabIndex=0),this.combobox?this.updateComplete.then(()=>{this.shadowRoot?.querySelector(".combobox-input").focus()}):this.updateComplete.then(()=>{this.shadowRoot?.querySelector(".select-face").focus()}))}get _isSuggestedOptionVisible(){if(!this.combobox||!this.creatable)return!1;const e=null!==this._opts.getOptionByValue(this._opts.filterPattern),t=this._opts.filterPattern.length>0;return!e&&t}_manageRequired(){}_setStateFromSlottedElements(){const e=this._assignedOptions??[];this._opts.clear(),e.forEach(e=>{const{innerText:t,description:o,disabled:i}=e,s="string"==typeof e.value?e.value:t.trim(),n=e.selected??!1,r={label:t.trim(),value:s,description:o,selected:n,disabled:i};this._opts.add(r)})}_createSuggestedOption(){const e=this._opts.numOptions,t=document.createElement("vscode-option");return t.value=this._opts.filterPattern,he(this._opts.filterPattern,t),this.appendChild(t),e}_dispatchChangeEvent(){this.dispatchEvent(new Event("change")),this.dispatchEvent(new Event("input"))}async _createAndSelectSuggestedOption(){}_toggleComboboxDropdown(){this._opts.filterPattern="",this.open=!this.open}_scrollActiveElementToTop(){this._optionListScrollPos=Math.floor(this._opts.relativeActiveIndex*Qt)}async _adjustOptionListScrollPos(e,t){let o=this._opts.numOfVisibleOptions;if(this._isSuggestedOptionVisible&&(o+=1),o<=10)return;this._isHoverForbidden=!0,window.addEventListener("mousemove",this._onMouseMove);const i=this._optionListScrollPos,s=t*Qt,n=s>=i&&s<=i+220-Qt;"down"===e&&(n||(this._optionListScrollPos=t*Qt-198)),"up"===e&&(n||(this._optionListScrollPos=Math.floor(this._opts.relativeActiveIndex*Qt)))}_onFaceClick(){this.open=!this.open}_handleDropdownToggle(e){this.open="open"===e.newState}_onComboboxButtonClick(){this._toggleComboboxDropdown()}_onComboboxButtonKeyDown(e){"Enter"===e.key&&this._toggleComboboxDropdown()}_onOptionMouseOver(e){if(this._isHoverForbidden)return;const t=e.target;t.matches(".option")&&(t.matches(".placeholder")?(this._isPlaceholderOptionActive=!0,this._opts.activeIndex=-1):(this._isPlaceholderOptionActive=!1,this._opts.activeIndex=+t.dataset.index))}_onPlaceholderOptionMouseOut(){this._isPlaceholderOptionActive=!1}_onNoOptionsClick(e){e.stopPropagation()}_onEnterKeyDown(e){this._isBeingFiltered=!1,e?.composedPath&&e.composedPath().find(e=>!!e.matches&&e.matches("vscode-button.button-accept"))}_onSpaceKeyDown(){this.open||(this.open=!0)}_onArrowUpKeyDown(){if(this.open){if(this._opts.activeIndex<=0&&(!this.combobox||!this.creatable))return;if(this._isPlaceholderOptionActive){const e=this._opts.numOfVisibleOptions-1;this._opts.activeIndex=e,this._isPlaceholderOptionActive=!1}else{const e=this._opts.prev();if(null!==e){this._opts.activeIndex=e?.index??-1;const t=e?.filteredIndex??-1;t>-1&&this._adjustOptionListScrollPos("up",t)}}}else this.open=!0,this._opts.activateDefault()}_onArrowDownKeyDown(){let e=this._opts.numOfVisibleOptions;const t=this._isSuggestedOptionVisible;if(t&&(e+=1),this.open){if(this._isPlaceholderOptionActive&&-1===this._opts.activeIndex)return;const o=this._opts.next();if(t&&null===o)this._isPlaceholderOptionActive=!0,this._adjustOptionListScrollPos("down",e-1),this._opts.activeIndex=-1;else if(null!==o){const e=o?.filteredIndex??-1;this._opts.activeIndex=o?.index??-1,e>-1&&this._adjustOptionListScrollPos("down",e)}}else this.open=!0,this._opts.activateDefault()}_onEscapeKeyDown(){this.open=!1}_onSlotChange(){this._setStateFromSlottedElements(),this.requestUpdate()}_onComboboxInputFocus(e){e.target.select(),this._isBeingFiltered=!1,this._opts.filterPattern=""}_onComboboxInputBlur(){this._isBeingFiltered=!1}_onComboboxInputInput(e){this._isBeingFiltered=!0,this._opts.filterPattern=e.target.value,this._opts.activeIndex=-1,this.open=!0}_onComboboxInputClick(){this._isBeingFiltered=""!==this._opts.filterPattern,this.open=!0}_onComboboxInputSpaceKeyDown(e){" "===e.key&&e.stopPropagation()}_onOptionClick(e){this._isBeingFiltered=!1}_renderCheckbox(e,t){return W`<span class=${De({"checkbox-icon":!0,checked:e})}>${Pt}</span
      ><span class="option-label">${t}</span>`}_renderOptions(){const e=this._opts.options;return W`
      <ul
        aria-label=${Ve(this.label??void 0)}
        aria-multiselectable=${Ve(this._opts.multiSelect?"true":void 0)}
        class="options"
        id="select-listbox"
        role="listbox"
        tabindex="-1"
        @click=${this._onOptionClick}
        @mouseover=${this._onOptionMouseOver}
      >
        ${Mt(e,e=>e.index,(e,t)=>{if(!e.visible)return Y;const o=e.index===this._opts.activeIndex&&!e.disabled,i=this._opts.getIsIndexSelected(e.index),s={active:o,disabled:e.disabled,option:!0,"single-select":!this._opts.multiSelect,"multi-select":this._opts.multiSelect,selected:i},n=e.ranges?.length?((e,t)=>{const o=[],i=t.length;return i<1?W`${e}`:(t.forEach((s,n)=>{const r=e.substring(s[0],s[1]);0===n&&0!==s[0]&&o.push(...Kt(e.substring(0,t[0][0]))),n>0&&n<i&&s[0]-t[n-1][1]!==0&&o.push(...Kt(e.substring(t[n-1][1],s[0]))),o.push(W`<b>${Kt(r)}</b>`),n===i-1&&s[1]<e.length&&o.push(...Kt(e.substring(s[1],e.length)))}),o)})(e.label,e.ranges??[]):e.label;return W`
              <li
                aria-selected=${i?"true":"false"}
                class=${De(s)}
                data-index=${e.index}
                data-filtered-index=${t}
                id=${`op-${e.index}`}
                role="option"
                tabindex="-1"
              >
                ${function(e,t){return e?t():n}(this._opts.multiSelect,()=>this._renderCheckbox(i,n))}
              </li>
            `})}
        ${this._renderPlaceholderOption(this._opts.numOfVisibleOptions<1)}
      </ul>
    `}_renderPlaceholderOption(e){return this.combobox?this._opts.getOptionByLabel(this._opts.filterPattern)?Y:this.creatable&&this._opts.filterPattern.length>0?W`<li
        class=${De({option:!0,placeholder:!0,active:this._isPlaceholderOptionActive})}
        @mouseout=${this._onPlaceholderOptionMouseOut}
      >
        Add "${this._opts.filterPattern}"
      </li>`:e?W`<li class="no-options" @click=${this._onNoOptionsClick}>
            No options
          </li>`:Y:Y}_renderDescription(){const e=this._opts.getActiveOption();if(!e)return Y;const{description:t}=e;return t?W`<div class="description">${t}</div>`:Y}_renderSelectFace(){return W`${Y}`}_renderComboboxFace(){return W`${Y}`}_renderDropdownControls(){return W`${Y}`}_renderDropdown(){const e={dropdown:!0,multiple:this._opts.multiSelect,open:this.open},t=this._isSuggestedOptionVisible||0===this._opts.numOfVisibleOptions?this._opts.numOfVisibleOptions+1:this._opts.numOfVisibleOptions,o=Math.min(t*Qt,220),i=this.getBoundingClientRect(),s={width:`${i.width}px`,left:`${i.left}px`,top:"below"===this.position?`${i.top+i.height}px`:"unset",bottom:"below"===this.position?"unset":document.documentElement.clientHeight-i.top+"px"};return W`
      <div
        class=${De(e)}
        popover="auto"
        @toggle=${this._handleDropdownToggle}
        .style=${Le(s)}
      >
        ${"above"===this.position?this._renderDescription():Y}
        <vscode-scrollable
          always-visible
          class="scrollable"
          min-thumb-size="40"
          tabindex="-1"
          @vsc-scrollable-scroll=${this._onOptionListScroll}
          .scrollPos=${this._optionListScrollPos}
          .style=${Le({height:`${o}px`})}
        >
          ${this._renderOptions()} ${this._renderDropdownControls()}
        </vscode-scrollable>
        ${"below"===this.position?this._renderDescription():Y}
      </div>
    `}}Jt([ge({type:Boolean,reflect:!0})],eo.prototype,"creatable",void 0),Jt([ge({type:Boolean,reflect:!0})],eo.prototype,"combobox",null),Jt([ge({reflect:!0})],eo.prototype,"label",void 0),Jt([ge({type:Boolean,reflect:!0})],eo.prototype,"disabled",null),Jt([ge({type:Boolean,reflect:!0})],eo.prototype,"invalid",void 0),Jt([ge()],eo.prototype,"filter",null),Jt([ge({type:Boolean,reflect:!0})],eo.prototype,"focused",void 0),Jt([ge({type:Boolean,reflect:!0})],eo.prototype,"open",void 0),Jt([ge({type:Array})],eo.prototype,"options",null),Jt([ge({reflect:!0})],eo.prototype,"position",void 0),Jt([we({flatten:!0,selector:"vscode-option"})],eo.prototype,"_assignedOptions",void 0),Jt([ye(".dropdown",!0)],eo.prototype,"_dropdownEl",void 0),Jt([_e()],eo.prototype,"_currentDescription",void 0),Jt([_e()],eo.prototype,"_filter",void 0),Jt([_e()],eo.prototype,"_filteredOptions",null),Jt([_e()],eo.prototype,"_selectedIndexes",void 0),Jt([_e()],eo.prototype,"_options",void 0),Jt([_e()],eo.prototype,"_value",void 0),Jt([_e()],eo.prototype,"_values",void 0),Jt([_e()],eo.prototype,"_isPlaceholderOptionActive",void 0),Jt([_e()],eo.prototype,"_isBeingFiltered",void 0),Jt([_e()],eo.prototype,"_optionListScrollPos",void 0);const to=[Ee,r`
    :host {
      display: inline-block;
      max-width: 100%;
      outline: none;
      position: relative;
      width: 320px;
    }

    .main-slot {
      display: none;
    }

    .select-face,
    .combobox-face {
      background-color: var(--vscode-settings-dropdownBackground, #313131);
      border-color: var(--vscode-settings-dropdownBorder, #3c3c3c);
      border-radius: 4px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-dropdownForeground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
      position: relative;
      user-select: none;
      width: 100%;
    }

    :host([invalid]) .select-face,
    :host(:invalid) .select-face,
    :host([invalid]) .combobox-face,
    :host(:invalid) .combobox-face {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .select-face {
      cursor: pointer;
      display: block;
      padding: 3px 4px;
    }

    .select-face .text {
      display: block;
      height: 18px;
      overflow: hidden;
      padding-right: 20px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select-face.multiselect {
      padding: 0;
    }

    .select-face-badge {
      background-color: var(--vscode-badge-background, #616161);
      border-radius: 2px;
      color: var(--vscode-badge-foreground, #f8f8f8);
      display: inline-block;
      flex-shrink: 0;
      font-size: 11px;
      line-height: 16px;
      margin: 2px;
      padding: 2px 3px;
      white-space: nowrap;
    }

    .select-face-badge.no-item {
      background-color: transparent;
      color: inherit;
    }

    .combobox-face {
      display: flex;
    }

    :host(:focus) .select-face,
    :host(:focus) .combobox-face,
    :host([focused]) .select-face,
    :host([focused]) .combobox-face {
      outline: none;
    }

    :host(:focus:not([open])) .select-face,
    :host(:focus:not([open])) .combobox-face,
    :host([focused]:not([open])) .select-face,
    :host([focused]:not([open])) .combobox-face {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    .combobox-input {
      background-color: transparent;
      box-sizing: border-box;
      border: 0;
      color: var(--vscode-foreground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      line-height: 16px;
      padding: 4px;
      width: 100%;
    }

    .combobox-input:focus {
      outline: none;
    }

    .combobox-button {
      align-items: center;
      background-color: transparent;
      border: 0;
      border-radius: 2px;
      box-sizing: content-box;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      flex-shrink: 0;
      height: 16px;
      justify-content: center;
      margin: 1px 1px 0 0;
      padding: 3px;
      width: 22px;
    }

    .combobox-button:hover,
    .combobox-button:focus-visible {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
      outline-style: dashed;
      outline-color: var(--vscode-toolbar-hoverOutline, transparent);
    }

    .combobox-button:focus-visible {
      outline: none;
    }

    .icon {
      color: var(--vscode-foreground, #cccccc);
      display: block;
      height: 14px;
      pointer-events: none;
      width: 14px;
    }

    .select-face .icon {
      position: absolute;
      right: 6px;
      top: 5px;
    }

    .icon svg {
      color: var(--vscode-foreground, #cccccc);
      height: 100%;
      width: 100%;
    }

    .dropdown {
      background-color: var(--vscode-settings-dropdownBackground, #313131);
      border-color: var(--vscode-settings-dropdownListBorder, #454545);
      border-radius: 4px;
      border-style: solid;
      border-width: 1px;
      bottom: unset;
      box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36));
      box-sizing: border-box;
      display: none;
      padding: 0;
      right: unset;
    }

    .dropdown.open {
      display: block;
    }

    :host([position='above']) .dropdown {
      bottom: 26px;
      padding-bottom: 0;
      padding-top: 2px;
      top: unset;
    }

    .scrollable {
      display: block;
      max-height: 222px;
      margin: 0;
      outline: none;
      overflow: hidden;
    }

    .options {
      box-sizing: border-box;
      cursor: pointer;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .option {
      box-sizing: border-box;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      height: 22px;
      line-height: 20px;
      min-height: calc(var(--vscode-font-size) * 1.3);
      padding: 1px 3px;
      user-select: none;
      outline-color: transparent;
      outline-offset: -1px;
      outline-style: solid;
      outline-width: 1px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .option.single-select {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .option.multi-select {
      align-items: center;
      display: flex;
    }

    .option b {
      color: var(--vscode-list-highlightForeground, #2aaaff);
    }

    .option.active b {
      color: var(--vscode-list-focusHighlightForeground, #2aaaff);
    }

    .option:not(.disabled):hover {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      color: var(--vscode-list-hoverForeground, #ffffff);
    }

    :host-context(body[data-vscode-theme-kind='vscode-high-contrast'])
      .option:hover,
    :host-context(body[data-vscode-theme-kind='vscode-high-contrast-light'])
      .option:hover {
      outline-style: dotted;
      outline-color: var(--vscode-list-focusOutline, #0078d4);
      outline-width: 1px;
    }

    .option.disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    .option.active,
    .option.active:hover {
      background-color: var(--vscode-list-activeSelectionBackground, #04395e);
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
      outline-color: var(--vscode-list-activeSelectionBackground, #04395e);
      outline-style: solid;
      outline-width: 1px;
    }

    .no-options {
      align-items: center;
      border-color: transparent;
      border-style: solid;
      border-width: 1px;
      color: var(--vscode-foreground, #cccccc);
      cursor: default;
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
      min-height: calc(var(--vscode-font-size) * 1.3);
      opacity: 0.85;
      padding: 1px 3px;
      user-select: none;
    }

    .placeholder {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .placeholder span {
      font-weight: bold;
    }

    .placeholder:not(.disabled):hover {
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
    }

    :host-context(body[data-vscode-theme-kind='vscode-high-contrast'])
      .option.active,
    :host-context(body[data-vscode-theme-kind='vscode-high-contrast-light'])
      .option.active:hover {
      outline-color: var(--vscode-list-focusOutline, #0078d4);
      outline-style: dashed;
    }

    .option-label {
      display: block;
      overflow: hidden;
      pointer-events: none;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    .dropdown.multiple .option.selected {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      outline-color: var(--vscode-list-hoverBackground, #2a2d2e);
    }

    .dropdown.multiple .option.selected.active {
      background-color: var(--vscode-list-activeSelectionBackground, #04395e);
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
      outline-color: var(--vscode-list-activeSelectionBackground, #04395e);
    }

    .checkbox-icon {
      align-items: center;
      background-color: var(--vscode-checkbox-background, #313131);
      border-radius: 2px;
      border: 1px solid var(--vscode-checkbox-border);
      box-sizing: border-box;
      color: var(--vscode-checkbox-foreground);
      display: flex;
      flex-basis: 15px;
      flex-shrink: 0;
      height: 15px;
      justify-content: center;
      margin-right: 5px;
      overflow: hidden;
      position: relative;
      width: 15px;
    }

    .checkbox-icon svg {
      display: none;
      height: 13px;
      width: 13px;
    }

    .checkbox-icon.checked svg {
      display: block;
    }

    .dropdown-controls {
      display: flex;
      justify-content: flex-end;
      padding: 4px;
    }

    .dropdown-controls :not(:last-child) {
      margin-right: 4px;
    }

    .action-icon {
      align-items: center;
      background-color: transparent;
      border: 0;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      height: 24px;
      justify-content: center;
      padding: 0;
      width: 24px;
    }

    .action-icon:focus {
      outline: none;
    }

    .action-icon:focus-visible {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }

    .description {
      border-color: var(--vscode-settings-dropdownBorder, #3c3c3c);
      border-style: solid;
      border-width: 1px 0 0;
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.3;
      padding: 6px 4px;
      word-wrap: break-word;
    }

    :host([position='above']) .description {
      border-width: 0 0 1px;
    }
  `],oo=to;var io=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let so=class extends eo{set selectedIndexes(e){this._opts.selectedIndexes=e}get selectedIndexes(){return this._opts.selectedIndexes}set value(e){this._opts.multiSelectValue=e,this._opts.selectedIndexes.length>0?this._requestedValueToSetLater=[]:this._requestedValueToSetLater=Array.isArray(e)?e:[e],this._setFormValue(),this._manageRequired()}get value(){return this._opts.multiSelectValue}get form(){return this._internals.form}get type(){return"select-multiple"}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}selectAll(){this._opts.selectAll()}selectNone(){this._opts.selectNone()}constructor(){super(),this.defaultValue=[],this.required=!1,this.name=void 0,this._requestedValueToSetLater=[],this._onOptionClick=e=>{const t=e.composedPath().find(e=>"matches"in e&&e.matches("li.option"));if(!t)return;if(t.classList.contains("placeholder"))return void this._createAndSelectSuggestedOption();const o=Number(t.dataset.index);this._opts.toggleOptionSelected(o),this._setFormValue(),this._manageRequired(),this._dispatchChangeEvent()},this._opts.multiSelect=!0,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._setDefaultValue(),this._manageRequired()})}formResetCallback(){this.updateComplete.then(()=>{this.value=this.defaultValue})}formStateRestoreCallback(e,t){const o=Array.from(e.entries()).map(e=>String(e[1]));this.updateComplete.then(()=>{this.value=o})}_setDefaultValue(){if(Array.isArray(this.defaultValue)&&this.defaultValue.length>0){const e=this.defaultValue.map(e=>String(e));this.value=e}}_dispatchChangeEvent(){super._dispatchChangeEvent()}_onFaceClick(){super._onFaceClick(),this._opts.activeIndex=0}_toggleComboboxDropdown(){super._toggleComboboxDropdown(),this._opts.activeIndex=-1}_manageRequired(){const{value:e}=this;0===e.length&&this.required?this._internals.setValidity({valueMissing:!0},"Please select an item in the list.",this._faceElement):this._internals.setValidity({})}_setFormValue(){const e=new FormData;this._values.forEach(t=>{e.append(this.name??"",t)}),this._internals.setFormValue(e)}async _createAndSelectSuggestedOption(){super._createAndSelectSuggestedOption();const e=this._createSuggestedOption();await this.updateComplete,this.selectedIndexes=[...this.selectedIndexes,e],this._dispatchChangeEvent();const t=new CustomEvent("vsc-multi-select-create-option",{detail:{value:this._opts.getOptionByIndex(e)?.value??""}});this.dispatchEvent(t),this.open=!1,this._isPlaceholderOptionActive=!1}_onSlotChange(){super._onSlotChange(),this._requestedValueToSetLater.length>0&&(this._opts.expandMultiSelection(this._requestedValueToSetLater),this._requestedValueToSetLater=this._requestedValueToSetLater.filter(e=>-1===this._opts.findOptionIndex(e)))}_onEnterKeyDown(e){super._onEnterKeyDown(e),this.open?this._isPlaceholderOptionActive?this._createAndSelectSuggestedOption():(this._opts.toggleActiveMultiselectOption(),this._setFormValue(),this._manageRequired(),this._dispatchChangeEvent()):(this._opts.filterPattern="",this.open=!0)}_onMultiAcceptClick(){this.open=!1}_onMultiDeselectAllClick(){this._opts.selectedIndexes=[],this._values=[],this._options=this._options.map(e=>({...e,selected:!1})),this._manageRequired(),this._dispatchChangeEvent()}_onMultiSelectAllClick(){this._opts.selectedIndexes=[],this._values=[],this._options=this._options.map(e=>({...e,selected:!0})),this._options.forEach((e,t)=>{this._selectedIndexes.push(t),this._values.push(e.value),this._dispatchChangeEvent()}),this._setFormValue(),this._manageRequired()}_onComboboxInputBlur(){super._onComboboxInputBlur(),this._opts.filterPattern=""}_renderLabel(){return 0===this._opts.selectedIndexes.length?W`<span class="select-face-badge no-item">0 Selected</span>`:W`<span class="select-face-badge"
          >${this._opts.selectedIndexes.length} Selected</span
        >`}_renderComboboxFace(){const e=this._opts.activeIndex>-1?`op-${this._opts.activeIndex}`:"",t=this.open?"true":"false";return W`
      <div class="combobox-face face">
        ${this._opts.multiSelect?this._renderLabel():Y}
        <input
          aria-activedescendant=${e}
          aria-autocomplete="list"
          aria-controls="select-listbox"
          aria-expanded=${t}
          aria-haspopup="listbox"
          aria-label=${Ve(this.label)}
          class="combobox-input"
          role="combobox"
          spellcheck="false"
          type="text"
          autocomplete="off"
          .value=${this._opts.filterPattern}
          @focus=${this._onComboboxInputFocus}
          @blur=${this._onComboboxInputBlur}
          @input=${this._onComboboxInputInput}
          @click=${this._onComboboxInputClick}
          @keydown=${this._onComboboxInputSpaceKeyDown}
        />
        <button
          aria-label="Open the list of options"
          class="combobox-button"
          type="button"
          @click=${this._onComboboxButtonClick}
          @keydown=${this._onComboboxButtonKeyDown}
          tabindex="-1"
        >
          ${At}
        </button>
      </div>
    `}_renderSelectFace(){const e=this._opts.activeIndex>-1?`op-${this._opts.activeIndex}`:"",t=this.open?"true":"false";return W`
      <div
        aria-activedescendant=${Ve(this._opts.multiSelect?void 0:e)}
        aria-controls="select-listbox"
        aria-expanded=${Ve(this._opts.multiSelect?void 0:t)}
        aria-haspopup="listbox"
        aria-label=${Ve(this.label??void 0)}
        class="select-face face multiselect"
        @click=${this._onFaceClick}
        .tabIndex=${this.disabled?-1:0}
      >
        ${this._renderLabel()} ${At}
      </div>
    `}_renderDropdownControls(){return this._filteredOptions.length>0?W`
          <div class="dropdown-controls">
            <button
              type="button"
              @click=${this._onMultiSelectAllClick}
              title="Select all"
              class="action-icon"
              id="select-all"
            >
              <vscode-icon name="checklist"></vscode-icon>
            </button>
            <button
              type="button"
              @click=${this._onMultiDeselectAllClick}
              title="Deselect all"
              class="action-icon"
              id="select-none"
            >
              <vscode-icon name="clear-all"></vscode-icon>
            </button>
            <vscode-button
              class="button-accept"
              @click=${this._onMultiAcceptClick}
              >OK</vscode-button
            >
          </div>
        `:W`${Y}`}render(){return W`
      <div class="multi-select">
        <slot class="main-slot" @slotchange=${this._onSlotChange}></slot>
        ${this.combobox?this._renderComboboxFace():this._renderSelectFace()}
        ${this._renderDropdown()}
      </div>
    `}};so.styles=oo,so.shadowRootOptions={...ue.shadowRootOptions,delegatesFocus:!0},so.formAssociated=!0,io([ge({type:Array,attribute:"default-value"})],so.prototype,"defaultValue",void 0),io([ge({type:Boolean,reflect:!0})],so.prototype,"required",void 0),io([ge({reflect:!0})],so.prototype,"name",void 0),io([ge({type:Array,attribute:!1})],so.prototype,"selectedIndexes",null),io([ge({type:Array})],so.prototype,"value",null),io([ye(".face")],so.prototype,"_faceElement",void 0),so=io([Ie("vscode-multi-select")],so);const no=[Ee,r`
    :host {
      display: block;
      height: 28px;
      margin: 0;
      outline: none;
      width: 28px;
    }

    .progress {
      height: 100%;
      width: 100%;
    }

    .background {
      fill: none;
      stroke: transparent;
      stroke-width: 2px;
    }

    .indeterminate-indicator-1 {
      fill: none;
      stroke: var(--vscode-progressBar-background, #0078d4);
      stroke-width: 2px;
      stroke-linecap: square;
      transform-origin: 50% 50%;
      transform: rotate(-90deg);
      transition: all 0.2s ease-in-out;
      animation: spin-infinite 2s linear infinite;
    }

    @keyframes spin-infinite {
      0% {
        stroke-dasharray: 0.01px 43.97px;
        transform: rotate(0deg);
      }
      50% {
        stroke-dasharray: 21.99px 21.99px;
        transform: rotate(450deg);
      }
      100% {
        stroke-dasharray: 0.01px 43.97px;
        transform: rotate(1080deg);
      }
    }
  `];var ro=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let ao=class extends $e{constructor(){super(...arguments),this.ariaLabel="Loading",this.ariaLive="assertive",this.role="alert"}render(){return W`<svg class="progress" part="progress" viewBox="0 0 16 16">
      <circle
        class="background"
        part="background"
        cx="8px"
        cy="8px"
        r="7px"
      ></circle>
      <circle
        class="indeterminate-indicator-1"
        part="indeterminate-indicator-1"
        cx="8px"
        cy="8px"
        r="7px"
      ></circle>
    </svg>`}};ao.styles=no,ro([ge({reflect:!0,attribute:"aria-label"})],ao.prototype,"ariaLabel",void 0),ro([ge({reflect:!0,attribute:"aria-live"})],ao.prototype,"ariaLive",void 0),ro([ge({reflect:!0})],ao.prototype,"role",void 0),ao=ro([Ie("vscode-progress-ring")],ao);const lo=[Ee,r`
    :host {
      display: block;
      height: 2px;
      width: 100%;
      outline: none;
    }

    .container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .track {
      position: absolute;
      inset: 0;
      background: transparent;
    }

    .indicator {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      height: 100%;
      background: var(--vscode-progressBar-background, #0078d4);
      will-change: transform, width, left;
    }

    /* Determinate mode: width is set inline via style attribute */
    .discrete .indicator {
      transition: width 100ms linear;
    }

    /* Indeterminate mode: VS Code style progress bit */
    .infinite .indicator {
      width: 2%;
      animation-name: progress;
      animation-duration: 4s;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
      transform: translate3d(0px, 0px, 0px);
    }

    /* Long running: reduce GPU pressure using stepped animation */
    .infinite.infinite-long-running .indicator {
      animation-timing-function: steps(100);
    }

    /* Keyframes adapted from VS Code */
    @keyframes progress {
      from {
        transform: translateX(0%) scaleX(1);
      }
      50% {
        transform: translateX(2500%) scaleX(3);
      }
      to {
        transform: translateX(4900%) scaleX(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .discrete .indicator {
        transition: none;
      }
      .infinite .indicator,
      .infinite-long-running .indicator {
        animation: none;
        width: 100%;
      }
    }
  `];var co=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let ho=class extends $e{constructor(){super(...arguments),this.ariaLabel="Loading",this.max=100,this.indeterminate=!1,this.longRunningThreshold=15e3,this._longRunning=!1}get _isDeterminate(){return!this.indeterminate&&"number"==typeof this.value&&isFinite(this.value)}connectedCallback(){super.connectedCallback(),this._maybeStartLongRunningTimer()}disconnectedCallback(){super.disconnectedCallback(),this._clearLongRunningTimer()}willUpdate(){this._maybeStartLongRunningTimer()}render(){const e=this.max>0?this.max:100,t=this._isDeterminate?Math.min(Math.max(this.value??0,0),e):0,o=this._isDeterminate?t/e*100:0,i={container:!0,discrete:this._isDeterminate,infinite:!this._isDeterminate,"infinite-long-running":this._longRunning&&!this._isDeterminate};return W`
      <div
        class=${De(i)}
        part="container"
        role="progressbar"
        aria-label=${this.ariaLabel}
        aria-valuemin="0"
        aria-valuemax=${String(e)}
        aria-valuenow=${Ve(this._isDeterminate?String(Math.round(t)):void 0)}
      >
        <div class="track" part="track"></div>
        <div
          class="indicator"
          part="indicator"
          .style=${Le({width:this._isDeterminate?`${o}%`:void 0})}
        ></div>
      </div>
    `}_maybeStartLongRunningTimer(){if(!(!this._isDeterminate&&this.longRunningThreshold>0&&this.isConnected))return this._clearLongRunningTimer(),void(this._longRunning=!1);this._longRunningHandle||(this._longRunningHandle=setTimeout(()=>{this._longRunning=!0,this._longRunningHandle=void 0,this.requestUpdate()},this.longRunningThreshold))}_clearLongRunningTimer(){this._longRunningHandle&&(clearTimeout(this._longRunningHandle),this._longRunningHandle=void 0)}};ho.styles=lo,co([ge({reflect:!0,attribute:"aria-label"})],ho.prototype,"ariaLabel",void 0),co([ge({type:Number,reflect:!0})],ho.prototype,"value",void 0),co([ge({type:Number,reflect:!0})],ho.prototype,"max",void 0),co([ge({type:Boolean,reflect:!0})],ho.prototype,"indeterminate",void 0),co([ge({type:Number,attribute:"long-running-threshold"})],ho.prototype,"longRunningThreshold",void 0),co([_e()],ho.prototype,"_longRunning",void 0),ho=co([Ie("vscode-progress-bar")],ho);const po=[Ee,Ye,r`
    :host(:invalid) .icon,
    :host([invalid]) .icon {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .icon {
      border-radius: 9px;
    }

    .icon.checked:before {
      background-color: currentColor;
      border-radius: 4px;
      content: '';
      height: 8px;
      left: 50%;
      margin: -4px 0 0 -4px;
      position: absolute;
      top: 50%;
      width: 8px;
    }

    :host(:focus):host(:not([disabled])) .icon {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }
  `];var uo=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let vo=class extends(Ge(Ke)){get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}constructor(){super(),this.autofocus=!1,this.checked=!1,this.defaultChecked=!1,this.invalid=!1,this.name="",this.type="radio",this.value="",this.disabled=!1,this.required=!1,this.tabIndex=0,this._slottedText="",this._handleClick=()=>{this.disabled||this.checked||(this._checkButton(),this._handleValueChange(),this.dispatchEvent(new Event("change",{bubbles:!0})))},this._handleKeyDown=e=>{this.disabled||"Enter"!==e.key&&" "!==e.key||(e.preventDefault()," "!==e.key||this.checked||(this.checked=!0,this._handleValueChange(),this.dispatchEvent(new Event("change",{bubbles:!0}))),"Enter"===e.key&&this._internals.form?.requestSubmit())},this._internals=this.attachInternals(),this.addEventListener("keydown",this._handleKeyDown),this.addEventListener("click",this._handleClick)}connectedCallback(){super.connectedCallback(),this._handleValueChange()}update(e){super.update(e),e.has("checked")&&this._handleValueChange(),e.has("required")&&this._handleValueChange()}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}formResetCallback(){this._getRadios().forEach(e=>{e.checked=e.defaultChecked}),this.updateComplete.then(()=>{this._handleValueChange()})}formStateRestoreCallback(e,t){this.value===e&&""!==e&&(this.checked=!0)}setComponentValidity(e){e?this._internals.setValidity({}):this._internals.setValidity({valueMissing:!0},"Please select one of these options.",this._inputEl)}_getRadios(){const e=this.getRootNode({composed:!1});if(!e)return[];const t=e.querySelectorAll(`vscode-radio[name="${this.name}"]`);return Array.from(t)}_uncheckOthers(e){e.forEach(e=>{e!==this&&(e.checked=!1)})}_checkButton(){const e=this._getRadios();this.checked=!0,e.forEach(e=>{e!==this&&(e.checked=!1)})}_setGroupValidity(e,t){this.updateComplete.then(()=>{e.forEach(e=>{e.setComponentValidity(t)})})}_setActualFormValue(){let e="";e=this.checked?this.value?this.value:"on":null,this._internals.setFormValue(e)}_handleValueChange(){const e=this._getRadios(),t=e.some(e=>e.required);if(this._setActualFormValue(),this.checked)this._uncheckOthers(e),this._setGroupValidity(e,!0);else{const o=!!e.find(e=>e.checked),i=t&&!o;this._setGroupValidity(e,!i)}}render(){const e=De({icon:!0,checked:this.checked}),t=De({"label-inner":!0,"is-slot-empty":""===this._slottedText});return W`
      <div class="wrapper">
        <input
          ?autofocus=${this.autofocus}
          id="input"
          class="radio"
          type="checkbox"
          ?checked=${this.checked}
          value=${this.value}
          tabindex=${this.tabIndex}
        />
        <div class=${e}></div>
        <label for="input" class="label" @click=${this._handleClick}>
          <span class=${t}>
            ${this._renderLabelAttribute()}
            <slot @slotchange=${this._handleSlotChange}></slot>
          </span>
        </label>
      </div>
    `}};vo.styles=po,vo.formAssociated=!0,vo.shadowRootOptions={...ue.shadowRootOptions,delegatesFocus:!0},uo([ge({type:Boolean,reflect:!0})],vo.prototype,"autofocus",void 0),uo([ge({type:Boolean,reflect:!0})],vo.prototype,"checked",void 0),uo([ge({type:Boolean,reflect:!0,attribute:"default-checked"})],vo.prototype,"defaultChecked",void 0),uo([ge({type:Boolean,reflect:!0})],vo.prototype,"invalid",void 0),uo([ge({reflect:!0})],vo.prototype,"name",void 0),uo([ge()],vo.prototype,"type",void 0),uo([ge()],vo.prototype,"value",void 0),uo([ge({type:Boolean,reflect:!0})],vo.prototype,"disabled",void 0),uo([ge({type:Boolean,reflect:!0})],vo.prototype,"required",void 0),uo([ge({type:Number,reflect:!0})],vo.prototype,"tabIndex",void 0),uo([_e()],vo.prototype,"_slottedText",void 0),uo([ye("#input")],vo.prototype,"_inputEl",void 0),vo=uo([Ie("vscode-radio")],vo);const bo=[Ee,r`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper {
      display: block;
    }

    ::slotted(vscode-radio) {
      margin-right: 20px;
    }

    ::slotted(vscode-radio:last-child) {
      margin-right: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-radio) {
      display: block;
      margin-bottom: 15px;
    }

    :host([variant='vertical']) ::slotted(vscode-radio:last-child) {
      margin-bottom: 0;
    }
  `];var fo=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let go=class extends $e{constructor(){super(),this.variant="horizontal",this.role="radiogroup",this._focusedRadio=-1,this._checkedRadio=-1,this._firstContentLoaded=!1,this._handleKeyDown=e=>{const{key:t}=e;["ArrowLeft","ArrowUp","ArrowRight","ArrowDown"].includes(t)&&e.preventDefault(),"ArrowRight"!==t&&"ArrowDown"!==t||this._checkNext(),"ArrowLeft"!==t&&"ArrowUp"!==t||this._checkPrev()},this.addEventListener("keydown",this._handleKeyDown)}_uncheckPreviousChecked(e,t){-1!==e&&(this._radios[e].checked=!1),-1!==t&&(this._radios[t].tabIndex=-1)}_afterCheck(){this._focusedRadio=this._checkedRadio,this._radios[this._checkedRadio].checked=!0,this._radios[this._checkedRadio].tabIndex=0,this._radios[this._checkedRadio].focus()}_checkPrev(){const e=this._radios.findIndex(e=>e.checked),t=this._radios.findIndex(e=>e.focused),o=-1!==t?t:e;this._uncheckPreviousChecked(e,t),this._checkedRadio=-1===o?this._radios.length-1:o-1>=0?o-1:this._radios.length-1,this._afterCheck()}_checkNext(){const e=this._radios.findIndex(e=>e.checked),t=this._radios.findIndex(e=>e.focused),o=-1!==t?t:e;this._uncheckPreviousChecked(e,t),-1===o?this._checkedRadio=0:o+1<this._radios.length?this._checkedRadio=o+1:this._checkedRadio=0,this._afterCheck()}_handleChange(e){const t=this._radios.findIndex(t=>t===e.target);-1!==t&&(-1!==this._focusedRadio&&(this._radios[this._focusedRadio].tabIndex=-1),-1!==this._checkedRadio&&this._checkedRadio!==t&&(this._radios[this._checkedRadio].checked=!1),this._focusedRadio=t,this._checkedRadio=t,this._radios[t].tabIndex=0)}_handleSlotChange(){if(!this._firstContentLoaded){const e=this._radios.findIndex(e=>e.autofocus);e>-1&&(this._focusedRadio=e),this._firstContentLoaded=!0}let e=-1;this._radios.forEach((t,o)=>{this._focusedRadio>-1?t.tabIndex=o===this._focusedRadio?0:-1:t.tabIndex=0===o?0:-1,t.defaultChecked&&(e>-1&&(this._radios[e].defaultChecked=!1),e=o)}),e>-1&&(this._radios[e].checked=!0)}render(){return W`
      <div class="wrapper">
        <slot
          @slotchange=${this._handleSlotChange}
          @change=${this._handleChange}
        ></slot>
      </div>
    `}};go.styles=bo,fo([ge({reflect:!0})],go.prototype,"variant",void 0),fo([ge({reflect:!0})],go.prototype,"role",void 0),fo([we({selector:"vscode-radio"})],go.prototype,"_radios",void 0),fo([_e()],go.prototype,"_focusedRadio",void 0),fo([_e()],go.prototype,"_checkedRadio",void 0),go=fo([Ie("vscode-radio-group")],go);const _o=to;var mo=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let yo=class extends eo{set selectedIndex(e){this._opts.selectedIndex=e;const t=this._opts.getOptionByIndex(e);t?(this._opts.activeIndex=e,this._value=t.value,this._internals.setFormValue(this._value),this._manageRequired()):(this._value="",this._internals.setFormValue(""),this._manageRequired())}get selectedIndex(){return this._opts.selectedIndex}set value(e){this._opts.value=e,this._opts.selectedIndex>-1?this._requestedValueToSetLater="":this._requestedValueToSetLater=e,this._internals.setFormValue(this._value),this._manageRequired()}get value(){return this._opts.value}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}updateInputValue(){if(!this.combobox)return;const e=this.renderRoot.querySelector(".combobox-input");if(e){const t=this._opts.getSelectedOption();e.value=t?.label??""}}constructor(){super(),this.defaultValue="",this.name=void 0,this.required=!1,this._requestedValueToSetLater="",this._opts.multiSelect=!1,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._manageRequired()})}formResetCallback(){this.value=this.defaultValue}formStateRestoreCallback(e,t){this.updateComplete.then(()=>{this.value=e})}get type(){return"select-one"}get form(){return this._internals.form}async _createAndSelectSuggestedOption(){const e=this._createSuggestedOption();await this.updateComplete,this._opts.selectedIndex=e,this._dispatchChangeEvent();const t=new CustomEvent("vsc-single-select-create-option",{detail:{value:this._opts.getOptionByIndex(e)?.value??""}});this.dispatchEvent(t),this.open=!1,this._isPlaceholderOptionActive=!1}_setStateFromSlottedElements(){super._setStateFromSlottedElements(),this.combobox||0!==this._opts.selectedIndexes.length||(this._opts.selectedIndex=this._opts.options.length>0?0:-1)}_onSlotChange(){if(super._onSlotChange(),this._requestedValueToSetLater){const e=this._opts.getOptionByValue(this._requestedValueToSetLater);e&&(this._opts.selectedIndex=e.index,this._requestedValueToSetLater="")}this._opts.selectedIndex>-1&&this._opts.numOptions>0?(this._internals.setFormValue(this._opts.value),this._manageRequired()):(this._internals.setFormValue(null),this._manageRequired())}_onEnterKeyDown(e){super._onEnterKeyDown(e);let t=!1;this.combobox?this.open?this._isPlaceholderOptionActive?this._createAndSelectSuggestedOption():(t=this._opts.activeIndex!==this._opts.selectedIndex,this._opts.selectedIndex=this._opts.activeIndex,this.open=!1):(this.open=!0,this._scrollActiveElementToTop()):this.open?(t=this._opts.activeIndex!==this._opts.selectedIndex,this._opts.selectedIndex=this._opts.activeIndex,this.open=!1):(this.open=!0,this._scrollActiveElementToTop()),t&&(this._dispatchChangeEvent(),this.updateInputValue(),this._internals.setFormValue(this._opts.value),this._manageRequired())}_onOptionClick(e){super._onOptionClick(e);const t=e.composedPath().find(e=>{if("matches"in e)return e.matches("li.option")});t&&!t.matches(".disabled")&&(t.classList.contains("placeholder")?this.creatable&&this._createAndSelectSuggestedOption():(this._opts.selectedIndex=Number(t.dataset.index),this.open=!1,this._internals.setFormValue(this._opts.value),this._manageRequired(),this._dispatchChangeEvent()))}_manageRequired(){const{value:e}=this;""===e&&this.required?this._internals.setValidity({valueMissing:!0},"Please select an item in the list.",this._face):this._internals.setValidity({})}_renderSelectFace(){const e=this._opts.getSelectedOption(),t=e?.label??"",o=this._opts.activeIndex>-1?`op-${this._opts.activeIndex}`:"";return W`
      <div
        aria-activedescendant=${o}
        aria-controls="select-listbox"
        aria-expanded=${this.open?"true":"false"}
        aria-haspopup="listbox"
        aria-label=${Ve(this.label)}
        class="select-face face"
        @click=${this._onFaceClick}
        role="combobox"
        tabindex="0"
      >
        <span class="text">${t}</span> ${At}
      </div>
    `}_renderComboboxFace(){let e="";if(this._isBeingFiltered)e=this._opts.filterPattern;else{const t=this._opts.getSelectedOption();e=t?.label??""}const t=this._opts.activeIndex>-1?`op-${this._opts.activeIndex}`:"",o=this.open?"true":"false";return W`
      <div class="combobox-face face">
        <input
          aria-activedescendant=${t}
          aria-autocomplete="list"
          aria-controls="select-listbox"
          aria-expanded=${o}
          aria-haspopup="listbox"
          aria-label=${Ve(this.label)}
          class="combobox-input"
          role="combobox"
          spellcheck="false"
          type="text"
          autocomplete="off"
          .value=${e}
          @focus=${this._onComboboxInputFocus}
          @blur=${this._onComboboxInputBlur}
          @input=${this._onComboboxInputInput}
          @click=${this._onComboboxInputClick}
          @keydown=${this._onComboboxInputSpaceKeyDown}
        />
        <button
          aria-label="Open the list of options"
          class="combobox-button"
          type="button"
          @click=${this._onComboboxButtonClick}
          @keydown=${this._onComboboxButtonKeyDown}
          tabindex="-1"
        >
          ${At}
        </button>
      </div>
    `}render(){return W`
      <div class="single-select">
        <slot class="main-slot" @slotchange=${this._onSlotChange}></slot>
        ${this.combobox?this._renderComboboxFace():this._renderSelectFace()}
        ${this._renderDropdown()}
      </div>
    `}};yo.styles=_o,yo.shadowRootOptions={...ue.shadowRootOptions,delegatesFocus:!0},yo.formAssociated=!0,mo([ge({attribute:"default-value"})],yo.prototype,"defaultValue",void 0),mo([ge({reflect:!0})],yo.prototype,"name",void 0),mo([ge({type:Number,attribute:"selected-index"})],yo.prototype,"selectedIndex",null),mo([ge({type:String})],yo.prototype,"value",null),mo([ge({type:Boolean,reflect:!0})],yo.prototype,"required",void 0),mo([ye(".face")],yo.prototype,"_face",void 0),yo=mo([Ie("vscode-single-select")],yo);const xo=[Ee,r`
    :host {
      --separator-border: var(--vscode-editorWidget-border, #454545);

      border: 1px solid var(--vscode-editorWidget-border, #454545);
      display: block;
      overflow: hidden;
      position: relative;
    }

    ::slotted(*) {
      height: 100%;
      width: 100%;
    }

    ::slotted(vscode-split-layout) {
      border: 0;
    }

    .wrapper {
      display: flex;
      height: 100%;
      width: 100%;
    }

    .wrapper.horizontal {
      flex-direction: column;
    }

    .start {
      box-sizing: border-box;
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    :host([split='vertical']) .start {
      border-right: 1px solid var(--separator-border);
    }

    :host([split='horizontal']) .start {
      border-bottom: 1px solid var(--separator-border);
    }

    .end {
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    :host([split='vertical']) .start,
    :host([split='vertical']) .end {
      height: 100%;
    }

    :host([split='horizontal']) .start,
    :host([split='horizontal']) .end {
      width: 100%;
    }

    .handle-overlay {
      display: none;
      height: 100%;
      left: 0;
      position: absolute;
      top: 0;
      width: 100%;
      z-index: 1;
    }

    .handle-overlay.active {
      display: block;
    }

    .handle-overlay.split-vertical {
      cursor: ew-resize;
    }

    .handle-overlay.split-horizontal {
      cursor: ns-resize;
    }

    .handle {
      background-color: transparent;
      position: absolute;
      z-index: 2;
    }

    .handle.hover {
      transition: background-color 0.1s ease-out 0.3s;
      background-color: var(--vscode-sash-hoverBorder, #0078d4);
    }

    .handle.hide {
      background-color: transparent;
      transition: background-color 0.1s ease-out;
    }

    .handle.split-vertical {
      cursor: ew-resize;
      height: 100%;
    }

    .handle.split-horizontal {
      cursor: ns-resize;
      width: 100%;
    }
  `];var wo,ko=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};const Co=e=>{if(!e)return{value:0,unit:"pixel"};let t,o;return e.endsWith("%")?(t="percent",o=+e.substring(0,e.length-1)):e.endsWith("px")?(t="pixel",o=+e.substring(0,e.length-2)):(t="pixel",o=+e),{unit:t,value:isNaN(o)?0:o}},So=(e,t)=>0===t?0:Math.min(100,e/t*100),$o=(e,t)=>t*(e/100);let Io=wo=class extends $e{set split(e){this._split!==e&&(this._split=e,this.resetHandlePosition())}get split(){return this._split}set handlePosition(e){this._rawHandlePosition=e,this._handlePositionPropChanged()}get handlePosition(){return this._rawHandlePosition}set fixedPane(e){this._fixedPane=e,this._fixedPanePropChanged()}get fixedPane(){return this._fixedPane}set minStart(e){const t=e??void 0;this._minStart!==t&&(this._minStart=t,this._applyMinSizeConstraints())}get minStart(){return this._minStart}set minEnd(e){const t=e??void 0;this._minEnd!==t&&(this._minEnd=t,this._applyMinSizeConstraints())}get minEnd(){return this._minEnd}constructor(){super(),this._split="vertical",this.resetOnDblClick=!1,this.handleSize=4,this.initialHandlePosition="50%",this._fixedPane="none",this._handlePosition=0,this._isDragActive=!1,this._hover=!1,this._hide=!1,this._boundRect=new DOMRect,this._handleOffset=0,this._wrapperObserved=!1,this._fixedPaneSize=0,this._handleResize=e=>{const t=e[0].contentRect,{width:o,height:i}=t;this._boundRect=t;const s="vertical"===this.split?o:i;"start"===this.fixedPane&&(this._handlePosition=this._fixedPaneSize),"end"===this.fixedPane&&(this._handlePosition=s-this._fixedPaneSize),this._handlePosition=this._clampHandlePosition(this._handlePosition,s),this._updateFixedPaneSize(s)},this._handleMouseUp=e=>{this._isDragActive=!1,e.target!==this&&(this._hover=!1,this._hide=!0),window.removeEventListener("mouseup",this._handleMouseUp),window.removeEventListener("mousemove",this._handleMouseMove);const{width:t,height:o}=this._boundRect,i="vertical"===this.split?t:o,s=So(this._handlePosition,i);this.dispatchEvent(new CustomEvent("vsc-split-layout-change",{detail:{position:this._handlePosition,positionInPercentage:s},composed:!0}))},this._handleMouseMove=e=>{const{clientX:t,clientY:o}=e,{left:i,top:s,height:n,width:r}=this._boundRect,a="vertical"===this.split,l=a?r:n,c=(a?t-i:o-s)-this._handleOffset+this.handleSize/2;this._handlePosition=this._clampHandlePosition(c,l),this._updateFixedPaneSize(l)},this._resizeObserver=new ResizeObserver(this._handleResize)}resetHandlePosition(){if(!this._wrapperEl)return void(this._handlePosition=0);const{width:e,height:t}=this._wrapperEl.getBoundingClientRect(),o="vertical"===this.split?e:t,{value:i,unit:s}=Co(this.initialHandlePosition??"50%"),n="percent"===s?$o(i,o):i;this._handlePosition=this._clampHandlePosition(n,o),this._updateFixedPaneSize(o)}connectedCallback(){super.connectedCallback()}firstUpdated(e){"none"!==this.fixedPane&&(this._resizeObserver.observe(this._wrapperEl),this._wrapperObserved=!0),this._boundRect=this._wrapperEl.getBoundingClientRect();const{value:t,unit:o}=this.handlePosition?Co(this.handlePosition):Co(this.initialHandlePosition);this._setPosition(t,o),this._initFixedPane()}_handlePositionPropChanged(){if(this.handlePosition&&this._wrapperEl){this._boundRect=this._wrapperEl.getBoundingClientRect();const{value:e,unit:t}=Co(this.handlePosition);this._setPosition(e,t)}}_fixedPanePropChanged(){this._wrapperEl&&this._initFixedPane()}_initFixedPane(){if("none"===this.fixedPane)this._wrapperObserved&&(this._resizeObserver.unobserve(this._wrapperEl),this._wrapperObserved=!1);else{const{width:e,height:t}=this._boundRect,o="vertical"===this.split?e:t;this._fixedPaneSize="start"===this.fixedPane?this._handlePosition:o-this._handlePosition,this._wrapperObserved||(this._resizeObserver.observe(this._wrapperEl),this._wrapperObserved=!0)}}_applyMinSizeConstraints(){if(!this._wrapperEl)return;this._boundRect=this._wrapperEl.getBoundingClientRect();const{width:e,height:t}=this._boundRect,o="vertical"===this.split?e:t;this._handlePosition=this._clampHandlePosition(this._handlePosition,o),this._updateFixedPaneSize(o)}_resolveMinSizePx(e,t){if(!e)return 0;const{unit:o,value:i}=Co(e),s="percent"===o?$o(i,t):i;return isFinite(s)?Math.max(0,Math.min(s,t)):0}_clampHandlePosition(e,t){if(!isFinite(t)||t<=0)return 0;const o=this._resolveMinSizePx(this._minStart,t),i=this._resolveMinSizePx(this._minEnd,t),s=Math.min(o,t),n=Math.max(s,t-i),r=Math.max(s,Math.min(e,n));return Math.max(0,Math.min(r,t))}_updateFixedPaneSize(e){"start"===this.fixedPane?this._fixedPaneSize=this._handlePosition:"end"===this.fixedPane&&(this._fixedPaneSize=e-this._handlePosition)}_setPosition(e,t){const{width:o,height:i}=this._boundRect,s="vertical"===this.split?o:i,n="percent"===t?$o(e,s):e;this._handlePosition=this._clampHandlePosition(n,s),this._updateFixedPaneSize(s)}_handleMouseOver(){this._hover=!0,this._hide=!1}_handleMouseOut(e){1!==e.buttons&&(this._hover=!1,this._hide=!0)}_handleMouseDown(e){e.stopPropagation(),e.preventDefault(),this._boundRect=this._wrapperEl.getBoundingClientRect();const{left:t,top:o}=this._boundRect,{left:i,top:s}=this._handleEl.getBoundingClientRect(),n=e.clientX-t,r=e.clientY-o;"vertical"===this.split&&(this._handleOffset=n-(i-t)),"horizontal"===this.split&&(this._handleOffset=r-(s-o)),this._isDragActive=!0,window.addEventListener("mouseup",this._handleMouseUp),window.addEventListener("mousemove",this._handleMouseMove)}_handleDblClick(){this.resetOnDblClick&&this.resetHandlePosition()}_handleSlotChange(){[...this._nestedLayoutsAtStart,...this._nestedLayoutsAtEnd].forEach(e=>{e instanceof wo&&e.resetHandlePosition()})}render(){const{width:e,height:t}=this._boundRect,o="vertical"===this.split?e:t,i="none"!==this.fixedPane?`${this._handlePosition}px`:`${So(this._handlePosition,o)}%`;let s="";s="start"===this.fixedPane?`0 0 ${this._fixedPaneSize}px`:`1 1 ${So(this._handlePosition,o)}%`;let n="";n="end"===this.fixedPane?`0 0 ${this._fixedPaneSize}px`:`1 1 ${So(o-this._handlePosition,o)}%`;const r={left:"vertical"===this.split?i:"0",top:"vertical"===this.split?"0":i},a=this.handleSize??4;"vertical"===this.split&&(r.marginLeft=0-a/2+"px",r.width=`${a}px`),"horizontal"===this.split&&(r.height=`${a}px`,r.marginTop=0-a/2+"px");const l=De({"handle-overlay":!0,active:this._isDragActive,"split-vertical":"vertical"===this.split,"split-horizontal":"horizontal"===this.split}),c=De({handle:!0,hover:this._hover,hide:this._hide,"split-vertical":"vertical"===this.split,"split-horizontal":"horizontal"===this.split}),d={wrapper:!0,horizontal:"horizontal"===this.split};return W`
      <div class=${De(d)}>
        <div class="start" .style=${Le({flex:s})}>
          <slot name="start" @slotchange=${this._handleSlotChange}></slot>
        </div>
        <div class="end" .style=${Le({flex:n})}>
          <slot name="end" @slotchange=${this._handleSlotChange}></slot>
        </div>
        <div class=${l}></div>
        <div
          class=${c}
          .style=${Le(r)}
          @mouseover=${this._handleMouseOver}
          @mouseout=${this._handleMouseOut}
          @mousedown=${this._handleMouseDown}
          @dblclick=${this._handleDblClick}
        ></div>
      </div>
    `}};Io.styles=xo,ko([ge({reflect:!0})],Io.prototype,"split",null),ko([ge({type:Boolean,reflect:!0,attribute:"reset-on-dbl-click"})],Io.prototype,"resetOnDblClick",void 0),ko([ge({type:Number,reflect:!0,attribute:"handle-size"})],Io.prototype,"handleSize",void 0),ko([ge({reflect:!0,attribute:"initial-handle-position"})],Io.prototype,"initialHandlePosition",void 0),ko([ge({attribute:"handle-position"})],Io.prototype,"handlePosition",null),ko([ge({attribute:"fixed-pane"})],Io.prototype,"fixedPane",null),ko([ge({attribute:"min-start"})],Io.prototype,"minStart",null),ko([ge({attribute:"min-end"})],Io.prototype,"minEnd",null),ko([_e()],Io.prototype,"_handlePosition",void 0),ko([_e()],Io.prototype,"_isDragActive",void 0),ko([_e()],Io.prototype,"_hover",void 0),ko([_e()],Io.prototype,"_hide",void 0),ko([ye(".wrapper")],Io.prototype,"_wrapperEl",void 0),ko([ye(".handle")],Io.prototype,"_handleEl",void 0),ko([we({slot:"start",selector:"vscode-split-layout"})],Io.prototype,"_nestedLayoutsAtStart",void 0),ko([we({slot:"end",selector:"vscode-split-layout"})],Io.prototype,"_nestedLayoutsAtEnd",void 0),Io=wo=ko([Ie("vscode-split-layout")],Io);const Eo=[Ee,r`
    :host {
      cursor: pointer;
      display: block;
      user-select: none;
    }

    .wrapper {
      align-items: center;
      border-bottom: 1px solid transparent;
      color: var(--vscode-foreground, #cccccc);
      display: flex;
      min-height: 20px;
      overflow: hidden;
      padding: 7px 8px;
      position: relative;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host([active]) .wrapper {
      border-bottom-color: var(--vscode-panelTitle-activeForeground, #cccccc);
      color: var(--vscode-panelTitle-activeForeground, #cccccc);
    }

    :host([panel]) .wrapper {
      border-bottom: 0;
      margin-bottom: 0;
      padding: 0;
    }

    :host(:focus-visible) {
      outline: none;
    }

    .wrapper {
      align-items: center;
      color: var(--vscode-foreground, #cccccc);
      display: flex;
      min-height: 20px;
      overflow: inherit;
      text-overflow: inherit;
      position: relative;
    }

    .wrapper.panel {
      color: var(--vscode-panelTitle-inactiveForeground, #9d9d9d);
    }

    .wrapper.panel.active,
    .wrapper.panel:hover {
      color: var(--vscode-panelTitle-activeForeground, #cccccc);
    }

    :host([panel]) .wrapper {
      display: flex;
      font-size: 11px;
      height: 31px;
      padding: 2px 10px;
      text-transform: uppercase;
    }

    .main {
      overflow: inherit;
      text-overflow: inherit;
    }

    .active-indicator {
      display: none;
    }

    .active-indicator.panel.active {
      border-top: 1px solid var(--vscode-panelTitle-activeBorder, #0078d4);
      bottom: 4px;
      display: block;
      left: 8px;
      pointer-events: none;
      position: absolute;
      right: 8px;
    }

    :host(:focus-visible) .wrapper {
      outline-color: var(--vscode-focusBorder, #0078d4);
      outline-offset: 3px;
      outline-style: solid;
      outline-width: 1px;
    }

    :host(:focus-visible) .wrapper.panel {
      outline-offset: -2px;
    }

    slot[name='content-before']::slotted(vscode-badge) {
      margin-right: 8px;
    }

    slot[name='content-after']::slotted(vscode-badge) {
      margin-left: 8px;
    }
  `];var Ao=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Po=class extends $e{constructor(){super(...arguments),this.active=!1,this.ariaControls="",this.panel=!1,this.role="tab",this.tabId=-1}attributeChangedCallback(e,t,o){if(super.attributeChangedCallback(e,t,o),"active"===e){const e=null!==o;this.ariaSelected=e?"true":"false",this.tabIndex=e?0:-1}}render(){return W`
      <div
        class=${De({wrapper:!0,active:this.active,panel:this.panel})}
      >
        <div class="before"><slot name="content-before"></slot></div>
        <div class="main"><slot></slot></div>
        <div class="after"><slot name="content-after"></slot></div>
        <span
          class=${De({"active-indicator":!0,active:this.active,panel:this.panel})}
        ></span>
      </div>
    `}};Po.styles=Eo,Ao([ge({type:Boolean,reflect:!0})],Po.prototype,"active",void 0),Ao([ge({reflect:!0,attribute:"aria-controls"})],Po.prototype,"ariaControls",void 0),Ao([ge({type:Boolean,reflect:!0})],Po.prototype,"panel",void 0),Ao([ge({reflect:!0})],Po.prototype,"role",void 0),Ao([ge({type:Number,reflect:!0,attribute:"tab-id"})],Po.prototype,"tabId",void 0),Po=Ao([Ie("vscode-tab-header")],Po);const Oo=[Ee,r`
    :host {
      display: block;
      overflow: hidden;
    }

    :host(:focus-visible) {
      outline-color: var(--vscode-focusBorder, #0078d4);
      outline-offset: 3px;
      outline-style: solid;
      outline-width: 1px;
    }

    :host([panel]) {
      background-color: var(--vscode-panel-background, #181818);
    }
  `];var Ro=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Bo=class extends $e{constructor(){super(...arguments),this.hidden=!1,this.ariaLabelledby="",this.panel=!1,this.role="tabpanel",this.tabIndex=0}render(){return W` <slot></slot> `}};Bo.styles=Oo,Ro([ge({type:Boolean,reflect:!0})],Bo.prototype,"hidden",void 0),Ro([ge({reflect:!0,attribute:"aria-labelledby"})],Bo.prototype,"ariaLabelledby",void 0),Ro([ge({type:Boolean,reflect:!0})],Bo.prototype,"panel",void 0),Ro([ge({reflect:!0})],Bo.prototype,"role",void 0),Ro([ge({type:Number,reflect:!0})],Bo.prototype,"tabIndex",void 0),Bo=Ro([Ie("vscode-tab-panel")],Bo);const zo=[Ee,r`
    :host {
      display: table;
      table-layout: fixed;
      width: 100%;
    }

    ::slotted(vscode-table-row:nth-child(even)) {
      background-color: var(--vsc-row-even-background);
    }

    ::slotted(vscode-table-row:nth-child(odd)) {
      background-color: var(--vsc-row-odd-background);
    }
  `];var Do=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Vo=class extends $e{constructor(){super(...arguments),this.role="rowgroup"}render(){return W` <slot></slot> `}};Vo.styles=zo,Do([ge({reflect:!0})],Vo.prototype,"role",void 0),Vo=Do([Ie("vscode-table-body")],Vo);const Lo=[Ee,r`
    :host {
      border-bottom-color: var(
        --vscode-editorGroup-border,
        rgba(255, 255, 255, 0.09)
      );
      border-bottom-style: solid;
      border-bottom-width: var(--vsc-row-border-bottom-width);
      box-sizing: border-box;
      color: var(--vscode-foreground, #cccccc);
      display: table-cell;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      height: 24px;
      overflow: hidden;
      padding-left: 10px;
      text-overflow: ellipsis;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host([compact]) {
      display: block;
      height: auto;
      padding-bottom: 5px;
      width: 100% !important;
    }

    :host([compact]:first-child) {
      padding-top: 10px;
    }

    :host([compact]:last-child) {
      padding-bottom: 10px;
    }

    .wrapper {
      overflow: inherit;
      text-overflow: inherit;
      white-space: inherit;
      width: 100%;
    }

    .column-label {
      font-weight: bold;
    }
  `];var Fo=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Mo=class extends $e{constructor(){super(...arguments),this.role="cell",this.columnLabel="",this.compact=!1}render(){const e=this.columnLabel?W`<div class="column-label" role="presentation">
          ${this.columnLabel}
        </div>`:Y;return W`
      <div class="wrapper">
        ${e}
        <slot></slot>
      </div>
    `}};Mo.styles=Lo,Fo([ge({reflect:!0})],Mo.prototype,"role",void 0),Fo([ge({attribute:"column-label"})],Mo.prototype,"columnLabel",void 0),Fo([ge({type:Boolean,reflect:!0})],Mo.prototype,"compact",void 0),Mo=Fo([Ie("vscode-table-cell")],Mo);const To=[Ee,r`
    :host {
      background-color: var(
        --vscode-keybindingTable-headerBackground,
        rgba(204, 204, 204, 0.04)
      );
      display: table;
      table-layout: fixed;
      width: 100%;
    }
  `];var Ho=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let jo=class extends $e{constructor(){super(...arguments),this.role="rowgroup"}render(){return W` <slot></slot> `}};jo.styles=To,Ho([ge({reflect:!0})],jo.prototype,"role",void 0),jo=Ho([Ie("vscode-table-header")],jo);const qo=[Ee,r`
    :host {
      box-sizing: border-box;
      color: var(--vscode-foreground, #cccccc);
      display: table-cell;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: bold;
      line-height: 20px;
      overflow: hidden;
      padding-bottom: 5px;
      padding-left: 10px;
      padding-right: 0;
      padding-top: 5px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wrapper {
      box-sizing: inherit;
      overflow: inherit;
      text-overflow: inherit;
      white-space: inherit;
      width: 100%;
    }
  `];var Uo=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let No=class extends $e{constructor(){super(...arguments),this.minWidth="0",this.index=-1,this.role="columnheader"}willUpdate(e){e.has("minWidth")&&this.index>-1&&this.dispatchEvent(new CustomEvent("vsc-table-change-min-column-width",{detail:{columnIndex:this.index,propertyValue:this.minWidth},bubbles:!0}))}render(){return W`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};No.styles=qo,Uo([ge({attribute:"min-width"})],No.prototype,"minWidth",void 0),Uo([ge({type:Number})],No.prototype,"index",void 0),Uo([ge({reflect:!0})],No.prototype,"role",void 0),No=Uo([Ie("vscode-table-header-cell")],No);const Wo=[Ee,r`
    :host {
      border-top-color: var(
        --vscode-editorGroup-border,
        rgba(255, 255, 255, 0.09)
      );
      border-top-style: solid;
      border-top-width: var(--vsc-row-border-top-width);
      display: var(--vsc-row-display);
      width: 100%;
    }
  `];var Ko=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let Go=class extends $e{constructor(){super(...arguments),this.role="row"}render(){return W` <slot></slot> `}};Go.styles=Wo,Ko([ge({reflect:!0})],Go.prototype,"role",void 0),Go=Ko([Ie("vscode-table-row")],Go);const Yo=e=>e,Xo=[{test:e=>/^-?\d+(\.\d+)?%$/.test(e),parse:e=>Number(e.slice(0,-1))},{test:e=>/^-?\d+(\.\d+)?px$/.test(e),parse:(e,t)=>Number(e.slice(0,-2))/t*100},{test:e=>/^-?\d+(\.\d+)?$/.test(e),parse:(e,t)=>Number(e)/t*100}],Zo=(e,t)=>{if(!Number.isFinite(t)||0===t)return null;if("number"==typeof e)return Number.isFinite(e)?e/t*100:null;const o=e.trim(),i=Xo.find(e=>e.test(o));return i?i.parse(o,t):null},Jo=[Ee,r`
    :host {
      display: block;
      --vsc-row-even-background: transparent;
      --vsc-row-odd-background: transparent;
      --vsc-row-border-bottom-width: 0;
      --vsc-row-border-top-width: 0;
      --vsc-row-display: table-row;
    }

    :host([bordered]),
    :host([bordered-rows]) {
      --vsc-row-border-bottom-width: 1px;
    }

    :host([compact]) {
      --vsc-row-display: block;
    }

    :host([bordered][compact]),
    :host([bordered-rows][compact]) {
      --vsc-row-border-bottom-width: 0;
      --vsc-row-border-top-width: 1px;
    }

    :host([zebra]) {
      --vsc-row-even-background: var(
        --vscode-keybindingTable-rowsBackground,
        rgba(204, 204, 204, 0.04)
      );
    }

    :host([zebra-odd]) {
      --vsc-row-odd-background: var(
        --vscode-keybindingTable-rowsBackground,
        rgba(204, 204, 204, 0.04)
      );
    }

    ::slotted(vscode-table-row) {
      width: 100%;
    }

    .wrapper {
      height: 100%;
      max-width: 100%;
      overflow: hidden;
      position: relative;
      width: 100%;
    }

    .wrapper.select-disabled {
      user-select: none;
    }

    .wrapper.resize-cursor {
      cursor: ew-resize;
    }

    .wrapper.compact-view .header-slot-wrapper {
      height: 0;
      overflow: hidden;
    }

    .scrollable {
      height: 100%;
    }

    .scrollable:before {
      background-color: transparent;
      content: '';
      display: block;
      height: 1px;
      position: absolute;
      width: 100%;
    }

    .wrapper:not(.compact-view) .scrollable:not([scrolled]):before {
      background-color: var(
        --vscode-editorGroup-border,
        rgba(255, 255, 255, 0.09)
      );
    }

    .sash {
      visibility: hidden;
    }

    :host([bordered-columns]) .sash,
    :host([bordered]) .sash {
      visibility: visible;
    }

    :host([resizable]) .wrapper:hover .sash {
      visibility: visible;
    }

    .sash {
      height: 100%;
      position: absolute;
      top: 0;
      width: 1px;
    }

    .wrapper.compact-view .sash {
      display: none;
    }

    .sash.resizable {
      cursor: ew-resize;
    }

    .sash-visible {
      background-color: var(
        --vscode-editorGroup-border,
        rgba(255, 255, 255, 0.09)
      );
      height: calc(100% - 30px);
      position: absolute;
      top: 30px;
      width: ${1}px;
    }

    .sash.hover .sash-visible {
      background-color: var(--vscode-sash-hoverBorder, #0078d4);
      transition: background-color 50ms linear 300ms;
    }

    .sash .sash-clickable {
      height: 100%;
      left: ${-2}px;
      position: absolute;
      width: ${5}px;
    }
  `];class Qo{constructor(e){this._hostWidth=0,this._hostX=0,this._activeSplitter=null,this._columnMinWidths=new Map,this._columnWidths=[],this._dragState=null,this._cachedSplitterPositions=null,(this._host=e).addController(this)}hostConnected(){this.saveHostDimensions()}get isDragging(){return null!==this._dragState}get splitterPositions(){if(this._cachedSplitterPositions)return this._cachedSplitterPositions;const e=[];let t=0;for(let o=0;o<this._columnWidths.length-1;o++)t=Yo(t+this._columnWidths[o]),e.push(t);return this._cachedSplitterPositions=e,e}getActiveSplitterCalculatedPosition(){const e=this.splitterPositions;if(!this._dragState)return 0;const t=e[this._dragState.splitterIndex];return this._toPx(t)}get columnWidths(){return this._columnWidths}get columnMinWidths(){return new Map(this._columnMinWidths)}saveHostDimensions(){const e=this._host.getBoundingClientRect(),{width:t,x:o}=e;return this._hostWidth=t,this._hostX=o,this}setActiveSplitter(e){return this._activeSplitter=e,this}getActiveSplitter(){return this._activeSplitter}setColumnMinWidthAt(e,t){return this._columnMinWidths.set(e,t),this._host.requestUpdate(),this}setColumWidths(e){return this._columnWidths=e,this._cachedSplitterPositions=null,this._host.requestUpdate(),this}shouldDrag(e){return+e.currentTarget.dataset.index===this._dragState?.splitterIndex}startDrag(e){if(e.stopPropagation(),this._dragState)return;this._activeSplitter?.setPointerCapture(e.pointerId);const t=e.pageX,o=e.currentTarget,i=t-o.getBoundingClientRect().x;this._dragState={dragOffset:i,pointerId:e.pointerId,splitterIndex:+o.dataset.index,prevX:t-i},this._host.requestUpdate()}drag(e){if(e.stopPropagation(),!e?.currentTarget?.hasPointerCapture?.(e.pointerId))return;if(!this._dragState)return;if(e.pointerId!==this._dragState.pointerId)return;if(!this.shouldDrag(e))return;const t=e.pageX,o=t-this._dragState.dragOffset,i=o-this._dragState.prevX,s=this._toPercent(i);this._dragState.prevX=o;const n=this.getActiveSplitterCalculatedPosition();i<=0&&t>n+this._hostX||i>0&&t<n+this._hostX||(this._columnWidths=function(e,t,o,i){const s=[...e];if(0===o||t<0||t>=e.length-1)return s;const n=Math.abs(o);let r=n;const a=[],l=[];for(let e=t;e>=0;e--)a.push(e);for(let o=t+1;o<e.length;o++)l.push(o);const c=o>0?l:a,d=o>0?a:l;let h=0;for(const e of c){const t=Math.max(0,s[e]-(i.get(e)??0));h=Yo(h+t)}if(h<r)return s;for(const e of c){if(0===r)break;const t=Math.max(0,s[e]-(i.get(e)??0)),o=Math.min(t,r);s[e]=Yo(s[e]-o),r=Yo(r-o)}let p=n;for(const e of d){if(0===p)break;s[e]=Yo(s[e]+p),p=Yo(0)}return s}(this._columnWidths,this._dragState.splitterIndex,s,this._columnMinWidths),this._cachedSplitterPositions=null,this._host.requestUpdate())}stopDrag(e){if(e.stopPropagation(),!this._dragState)return;const t=e.currentTarget;try{t.releasePointerCapture(this._dragState.pointerId)}catch(e){}this._dragState=null,this._activeSplitter=null,this._host.requestUpdate()}_toPercent(e){return(e=>e/this._hostWidth*100)(e)}_toPx(e){return(e=>e/100*this._hostWidth)(e)}}var ei=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let ti=class extends $e{set columns(e){if(!Array.isArray(e))return this.warn('Invalid value for "columns": expected an array.'),void(this._columns=[]);this._columns=e,this.isConnected&&this._initDefaultColumnSizes()}get columns(){return this._columns}constructor(){super(),this.role="table",this.resizable=!1,this.responsive=!1,this.bordered=!1,this.borderedColumns=!1,this.borderedRows=!1,this.breakpoint=300,this.minColumnWidth="50px",this.delayedResizing=!1,this.compact=!1,this.zebra=!1,this.zebraOdd=!1,this._sashPositions=[],this._isDragging=!1,this._sashHovers=[],this._columns=[],this._activeSashElementIndex=-1,this._componentH=0,this._componentW=0,this._headerCells=[],this._cellsOfFirstRow=[],this._prevHeaderHeight=0,this._prevComponentHeight=0,this._columnResizeController=new Qo(this),this._componentResizeObserverCallback=()=>{this._memoizeComponentDimensions(),this._updateResizeHandlersSize(),this.responsive&&this._toggleCompactView(),this._resizeTableBody()},this._headerResizeObserverCallback=()=>{this._updateResizeHandlersSize()},this._bodyResizeObserverCallback=()=>{this._resizeTableBody()},this._handleSplitterPointerMove=e=>{this._columnResizeController.shouldDrag(e)&&(this._columnResizeController.drag(e),this.delayedResizing?this._resizeColumns(!1):this._resizeColumns(!0))},this._handleSplitterPointerUp=e=>{this._stopDrag(e)},this._handleSplitterPointerCancel=e=>{this._stopDrag(e)},this._handleMinColumnWidthChange=e=>{const{columnIndex:t,propertyValue:o}=e.detail,i=Zo(o,this._componentW);i&&this._columnResizeController.setColumnMinWidthAt(t,i)},this.addEventListener("vsc-table-change-min-column-width",this._handleMinColumnWidthChange)}connectedCallback(){super.connectedCallback(),this._memoizeComponentDimensions(),this._initDefaultColumnSizes()}disconnectedCallback(){super.disconnectedCallback(),this._componentResizeObserver?.unobserve(this),this._componentResizeObserver?.disconnect(),this._bodyResizeObserver?.disconnect()}willUpdate(e){if(e.has("minColumnWidth")){const e=Zo(this.minColumnWidth,this._componentW)??0,t=this._columnResizeController.columnMinWidths,o=this._columnResizeController.columnWidths;for(let i=0;i<o.length;i++)t.has(i)||this._columnResizeController.setColumnMinWidthAt(i,e)}}_memoizeComponentDimensions(){const e=this.getBoundingClientRect();this._componentH=e.height,this._componentW=e.width}_queryHeaderCells(){const e=this._assignedHeaderElements;return e&&e[0]?Array.from(e[0].querySelectorAll("vscode-table-header-cell")):[]}_getHeaderCells(){return this._headerCells.length||(this._headerCells=this._queryHeaderCells()),this._headerCells}_queryCellsOfFirstRow(){const e=this._assignedBodyElements;return e&&e[0]?Array.from(e[0].querySelectorAll("vscode-table-row:first-child vscode-table-cell")):[]}_getCellsOfFirstRow(){return this._cellsOfFirstRow.length||(this._cellsOfFirstRow=this._queryCellsOfFirstRow()),this._cellsOfFirstRow}_resizeTableBody(){let e=0,t=0;const o=this.getBoundingClientRect().height;this._assignedHeaderElements&&this._assignedHeaderElements.length&&(e=this._assignedHeaderElements[0].getBoundingClientRect().height),this._assignedBodyElements&&this._assignedBodyElements.length&&(t=this._assignedBodyElements[0].getBoundingClientRect().height);const i=t-e-o;this._scrollableElement.style.height=i>0?o-e+"px":"auto"}_initResizeObserver(){this._componentResizeObserver=new ResizeObserver(this._componentResizeObserverCallback),this._componentResizeObserver.observe(this),this._headerResizeObserver=new ResizeObserver(this._headerResizeObserverCallback),this._headerResizeObserver.observe(this._headerElement)}_calculateInitialColumnWidths(){const e=this._getHeaderCells().length;let t=this.columns.slice(0,e);const o=t.filter(e=>"auto"===e).length+e-t.length;let i=100;if(t=t.map(e=>{const t=Zo(e,this._componentW);return null===t?"auto":(i-=t,t)}),t.length<e)for(let o=t.length;o<e;o++)t.push("auto");return t=t.map(e=>"auto"===e?i/o:e),t}_initHeaderCellSizes(e){this._getHeaderCells().forEach((t,o)=>{t.style.width=`${e[o]}%`})}_initBodyColumnSizes(e){this._getCellsOfFirstRow().forEach((t,o)=>{t.style.width=`${e[o]}%`})}_initSashes(e){const t=e.length;let o=0;this._sashPositions=[],e.forEach((e,i)=>{if(i<t-1){const t=o+e;this._sashPositions.push(t),o=t}})}_initDefaultColumnSizes(){const e=this._calculateInitialColumnWidths();this._columnResizeController.setColumWidths(e.map(e=>e)),this._initHeaderCellSizes(e),this._initBodyColumnSizes(e),this._initSashes(e)}_updateResizeHandlersSize(){const e=this._headerElement.getBoundingClientRect();if(e.height===this._prevHeaderHeight&&this._componentH===this._prevComponentHeight)return;this._prevHeaderHeight=e.height,this._prevComponentHeight=this._componentH;const t=this._componentH-e.height;this._sashVisibleElements.forEach(o=>{o.style.height=`${t}px`,o.style.top=`${e.height}px`})}_applyCompactViewColumnLabels(){const e=this._getHeaderCells().map(e=>e.innerText);this.querySelectorAll("vscode-table-row").forEach(t=>{t.querySelectorAll("vscode-table-cell").forEach((t,o)=>{t.columnLabel=e[o],t.compact=!0})})}_clearCompactViewColumnLabels(){this.querySelectorAll("vscode-table-cell").forEach(e=>{e.columnLabel="",e.compact=!1})}_toggleCompactView(){const e=this.getBoundingClientRect().width<this.breakpoint;this.compact!==e&&(this.compact=e,e?this._applyCompactViewColumnLabels():this._clearCompactViewColumnLabels())}_stopDrag(e){const t=this._columnResizeController.getActiveSplitter();t&&(t.removeEventListener("pointermove",this._handleSplitterPointerMove),t.removeEventListener("pointerup",this._handleSplitterPointerUp),t.removeEventListener("pointercancel",this._handleSplitterPointerCancel)),this._columnResizeController.stopDrag(e),this._resizeColumns(!0),this._sashHovers[this._activeSashElementIndex]=!1,this._isDragging=!1,this._activeSashElementIndex=-1}_onDefaultSlotChange(){this._assignedElements.forEach(e=>{"vscode-table-header"!==e.tagName.toLowerCase()?"vscode-table-body"!==e.tagName.toLowerCase()||(e.slot="body"):e.slot="header"})}_onHeaderSlotChange(){this._headerCells=this._queryHeaderCells(),[].fill(0,0,this._headerCells.length-1),this._headerCells.forEach((e,t)=>{if(e.index=t,e.minWidth){const o=Zo(e.minWidth,this._componentW)??0;this._columnResizeController.setColumnMinWidthAt(t,o)}})}_onBodySlotChange(){if(this._initDefaultColumnSizes(),this._initResizeObserver(),this._updateResizeHandlersSize(),!this._bodyResizeObserver){const e=this._assignedBodyElements[0]??null;e&&(this._bodyResizeObserver=new ResizeObserver(this._bodyResizeObserverCallback),this._bodyResizeObserver.observe(e))}}_onSashMouseOver(e){if(this._isDragging)return;const t=e.currentTarget,o=Number(t.dataset.index);this._sashHovers[o]=!0,this.requestUpdate()}_onSashMouseOut(e){if(e.stopPropagation(),this._isDragging)return;const t=e.currentTarget,o=Number(t.dataset.index);this._sashHovers[o]=!1,this.requestUpdate()}_resizeColumns(e=!0){const t=this._columnResizeController.columnWidths;this._getHeaderCells().forEach((e,o)=>e.style.width=`${t[o]}%`),e&&this._getCellsOfFirstRow().forEach((e,o)=>e.style.width=`${t[o]}%`)}_handleSplitterPointerDown(e){e.stopPropagation();const t=e.currentTarget;this._columnResizeController.saveHostDimensions().setActiveSplitter(t).startDrag(e),t.addEventListener("pointermove",this._handleSplitterPointerMove),t.addEventListener("pointerup",this._handleSplitterPointerUp),t.addEventListener("pointercancel",this._handleSplitterPointerCancel)}render(){const e=this._columnResizeController.splitterPositions.map((e,t)=>{const o=De({sash:!0,hover:this._sashHovers[t],resizable:this.resizable}),i=`${e}%`;return this.resizable?W`
            <div
              class=${o}
              data-index=${t}
              .style=${Le({left:i})}
              @pointerdown=${this._handleSplitterPointerDown}
              @mouseover=${this._onSashMouseOver}
              @mouseout=${this._onSashMouseOut}
            >
              <div class="sash-visible"></div>
              <div class="sash-clickable"></div>
            </div>
          `:W`<div
            class=${o}
            data-index=${t}
            .style=${Le({left:i})}
          >
            <div class="sash-visible"></div>
          </div>`}),t=De({wrapper:!0,"select-disabled":this._columnResizeController.isDragging,"resize-cursor":this._columnResizeController.isDragging,"compact-view":this.compact});return W`
      <div class=${t}>
        <div class="header">
          <slot name="caption"></slot>
          <div class="header-slot-wrapper">
            <slot name="header" @slotchange=${this._onHeaderSlotChange}></slot>
          </div>
        </div>
        <vscode-scrollable class="scrollable">
          <div>
            <slot name="body" @slotchange=${this._onBodySlotChange}></slot>
          </div>
        </vscode-scrollable>
        ${e}
        <slot @slotchange=${this._onDefaultSlotChange}></slot>
      </div>
    `}};ti.styles=Jo,ei([ge({reflect:!0})],ti.prototype,"role",void 0),ei([ge({type:Boolean,reflect:!0})],ti.prototype,"resizable",void 0),ei([ge({type:Boolean,reflect:!0})],ti.prototype,"responsive",void 0),ei([ge({type:Boolean,reflect:!0})],ti.prototype,"bordered",void 0),ei([ge({type:Boolean,reflect:!0,attribute:"bordered-columns"})],ti.prototype,"borderedColumns",void 0),ei([ge({type:Boolean,reflect:!0,attribute:"bordered-rows"})],ti.prototype,"borderedRows",void 0),ei([ge({type:Number})],ti.prototype,"breakpoint",void 0),ei([ge({type:Array})],ti.prototype,"columns",null),ei([ge({attribute:"min-column-width"})],ti.prototype,"minColumnWidth",void 0),ei([ge({type:Boolean,reflect:!0,attribute:"delayed-resizing"})],ti.prototype,"delayedResizing",void 0),ei([ge({type:Boolean,reflect:!0})],ti.prototype,"compact",void 0),ei([ge({type:Boolean,reflect:!0})],ti.prototype,"zebra",void 0),ei([ge({type:Boolean,reflect:!0,attribute:"zebra-odd"})],ti.prototype,"zebraOdd",void 0),ei([ye(".header")],ti.prototype,"_headerElement",void 0),ei([ye(".scrollable")],ti.prototype,"_scrollableElement",void 0),ei([(e,t)=>me(e,t,{get(){return(this.renderRoot??(xe??=document.createDocumentFragment())).querySelectorAll(".sash-visible")}})],ti.prototype,"_sashVisibleElements",void 0),ei([we({flatten:!0,selector:"vscode-table-header, vscode-table-body"})],ti.prototype,"_assignedElements",void 0),ei([we({slot:"header",flatten:!0,selector:"vscode-table-header"})],ti.prototype,"_assignedHeaderElements",void 0),ei([we({slot:"body",flatten:!0,selector:"vscode-table-body"})],ti.prototype,"_assignedBodyElements",void 0),ei([_e()],ti.prototype,"_sashPositions",void 0),ei([_e()],ti.prototype,"_isDragging",void 0),ti=ei([Ie("vscode-table")],ti);const oi=[Ee,r`
    :host {
      display: block;
    }

    .header {
      align-items: center;
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      width: 100%;
    }

    .header {
      border-bottom-color: var(--vscode-settings-headerBorder, #2b2b2b);
      border-bottom-style: solid;
      border-bottom-width: 1px;
    }

    .header.panel {
      background-color: var(--vscode-panel-background, #181818);
      border-bottom-width: 0;
      box-sizing: border-box;
      padding-left: 8px;
      padding-right: 8px;
    }

    .tablist {
      display: flex;
      margin-bottom: -1px;
    }

    slot[name='addons'] {
      display: block;
      margin-left: auto;
    }
  `];var ii=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let si=class extends $e{constructor(){super(),this.panel=!1,this.selectedIndex=0,this._tabHeaders=[],this._tabPanels=[],this._componentId="",this._tabFocus=0,this._componentId=St()}attributeChangedCallback(e,t,o){super.attributeChangedCallback(e,t,o),"selected-index"===e&&this._setActiveTab(),"panel"===e&&(this._tabHeaders.forEach(e=>e.panel=null!==o),this._tabPanels.forEach(e=>e.panel=null!==o))}_dispatchSelectEvent(){this.dispatchEvent(new CustomEvent("vsc-tabs-select",{detail:{selectedIndex:this.selectedIndex},composed:!0}))}_setActiveTab(){this._tabFocus=this.selectedIndex,this._tabPanels.forEach((e,t)=>{e.hidden=t!==this.selectedIndex}),this._tabHeaders.forEach((e,t)=>{e.active=t===this.selectedIndex})}_focusPrevTab(){0===this._tabFocus?this._tabFocus=this._tabHeaders.length-1:this._tabFocus-=1}_focusNextTab(){this._tabFocus===this._tabHeaders.length-1?this._tabFocus=0:this._tabFocus+=1}_onHeaderKeyDown(e){"ArrowLeft"!==e.key&&"ArrowRight"!==e.key||(e.preventDefault(),this._tabHeaders[this._tabFocus].setAttribute("tabindex","-1"),"ArrowLeft"===e.key?this._focusPrevTab():"ArrowRight"===e.key&&this._focusNextTab(),this._tabHeaders[this._tabFocus].setAttribute("tabindex","0"),this._tabHeaders[this._tabFocus].focus()),"Enter"===e.key&&(e.preventDefault(),this.selectedIndex=this._tabFocus,this._dispatchSelectEvent())}_moveHeadersToHeaderSlot(){const e=this._mainSlotElements.filter(e=>e instanceof Po);e.length>0&&e.forEach(e=>e.setAttribute("slot","header"))}_onMainSlotChange(){this._moveHeadersToHeaderSlot(),this._tabPanels=this._mainSlotElements.filter(e=>e instanceof Bo),this._tabPanels.forEach((e,t)=>{e.ariaLabelledby=`t${this._componentId}-h${t}`,e.id=`t${this._componentId}-p${t}`,e.panel=this.panel}),this._setActiveTab()}_onHeaderSlotChange(){this._tabHeaders=this._headerSlotElements.filter(e=>e instanceof Po),this._tabHeaders.forEach((e,t)=>{e.tabId=t,e.id=`t${this._componentId}-h${t}`,e.ariaControls=`t${this._componentId}-p${t}`,e.panel=this.panel,e.active=t===this.selectedIndex})}_onHeaderClick(e){const t=e.composedPath().find(e=>e instanceof Po);t&&(this.selectedIndex=t.tabId,this._setActiveTab(),this._dispatchSelectEvent())}render(){return W`
      <div
        class=${De({header:!0,panel:this.panel})}
        @click=${this._onHeaderClick}
        @keydown=${this._onHeaderKeyDown}
      >
        <div role="tablist" class="tablist">
          <slot
            name="header"
            @slotchange=${this._onHeaderSlotChange}
            role="tablist"
          ></slot>
        </div>
        <slot name="addons"></slot>
      </div>
      <slot @slotchange=${this._onMainSlotChange}></slot>
    `}};si.styles=oi,ii([ge({type:Boolean,reflect:!0})],si.prototype,"panel",void 0),ii([ge({type:Number,reflect:!0,attribute:"selected-index"})],si.prototype,"selectedIndex",void 0),ii([we({slot:"header"})],si.prototype,"_headerSlotElements",void 0),ii([we()],si.prototype,"_mainSlotElements",void 0),si=ii([Ie("vscode-tabs")],si);const ni=[Ee,r`
    :host {
      display: inline-block;
      height: auto;
      position: relative;
      width: 320px;
    }

    :host([cols]) {
      width: auto;
    }

    :host([rows]) {
      height: auto;
    }

    .shadow {
      box-shadow: var(--vscode-scrollbar-shadow, #000000) 0 6px 6px -6px inset;
      display: none;
      inset: 0 0 auto 0;
      height: 6px;
      pointer-events: none;
      position: absolute;
      width: 100%;
    }

    .shadow.visible {
      display: block;
    }

    textarea {
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border-color: var(--vscode-settings-textInputBorder, transparent);
      border-radius: 4px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      height: 100%;
      width: 100%;
    }

    :host([cols]) textarea {
      width: auto;
    }

    :host([rows]) textarea {
      height: auto;
    }

    :host([invalid]) textarea,
    :host(:invalid) textarea {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    textarea.monospace {
      background-color: var(--vscode-editor-background, #1f1f1f);
      color: var(--vscode-editor-foreground, #cccccc);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 14px);
      font-weight: var(--vscode-editor-font-weight, normal);
    }

    .textarea.monospace::placeholder {
      color: var(
        --vscode-editor-inlineValuesForeground,
        rgba(255, 255, 255, 0.5)
      );
    }

    textarea.cursor-pointer {
      cursor: pointer;
    }

    textarea:focus {
      border-color: var(--vscode-focusBorder, #0078d4);
      outline: none;
    }

    textarea::placeholder {
      color: var(--vscode-input-placeholderForeground, #989898);
      opacity: 1;
    }

    textarea::-webkit-scrollbar-track {
      background-color: transparent;
    }

    textarea::-webkit-scrollbar {
      width: 14px;
    }

    textarea::-webkit-scrollbar-thumb {
      background-color: transparent;
    }

    textarea:hover::-webkit-scrollbar-thumb {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
    }

    textarea::-webkit-scrollbar-thumb:hover {
      background-color: var(
        --vscode-scrollbarSlider-hoverBackground,
        rgba(100, 100, 100, 0.7)
      );
    }

    textarea::-webkit-scrollbar-thumb:active {
      background-color: var(
        --vscode-scrollbarSlider-activeBackground,
        rgba(191, 191, 191, 0.4)
      );
    }

    textarea::-webkit-scrollbar-corner {
      background-color: transparent;
    }

    textarea::-webkit-resizer {
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAACJJREFUeJxjYMAOZuIQZ5j5//9/rJJESczEKYGsG6cEXgAAsEEefMxkua4AAAAASUVORK5CYII=');
      background-repeat: no-repeat;
      background-position: right bottom;
    }
  `];var ri=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let ai=class extends $e{set value(e){this._value=e,this._internals.setFormValue(e)}get value(){return this._value}get wrappedElement(){return this._textareaEl}get form(){return this._internals.form}get type(){return"textarea"}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}set minlength(e){this.minLength=e}get minlength(){return this.minLength}set maxlength(e){this.maxLength=e}get maxlength(){return this.maxLength}constructor(){super(),this.autocomplete=void 0,this.autofocus=!1,this.defaultValue="",this.disabled=!1,this.invalid=!1,this.label="",this.maxLength=void 0,this.minLength=void 0,this.rows=void 0,this.cols=void 0,this.name=void 0,this.placeholder=void 0,this.readonly=!1,this.resize="none",this.required=!1,this.spellcheck=!1,this.monospace=!1,this._value="",this._textareaPointerCursor=!1,this._shadow=!1,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._textareaEl.checkValidity(),this._setValidityFromInput(),this._internals.setFormValue(this._textareaEl.value)})}updated(e){const t=["maxLength","minLength","required"];for(const o of e.keys())if(t.includes(String(o))){this.updateComplete.then(()=>{this._setValidityFromInput()});break}}formResetCallback(){this.value=this.defaultValue}formStateRestoreCallback(e,t){this.updateComplete.then(()=>{this._value=e})}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}_setValidityFromInput(){this._internals.setValidity(this._textareaEl.validity,this._textareaEl.validationMessage,this._textareaEl)}_dataChanged(){this._value=this._textareaEl.value,this._internals.setFormValue(this._textareaEl.value)}_handleChange(){this._dataChanged(),this._setValidityFromInput(),this.dispatchEvent(new Event("change"))}_handleInput(){this._dataChanged(),this._setValidityFromInput()}_handleMouseMove(e){if(this._textareaEl.clientHeight>=this._textareaEl.scrollHeight)return void(this._textareaPointerCursor=!1);const t=this._textareaEl.getBoundingClientRect(),o=e.clientX;this._textareaPointerCursor=o>=t.left+t.width-14-2}_handleScroll(){this._shadow=this._textareaEl.scrollTop>0}render(){return W`
      <div
        class=${De({shadow:!0,visible:this._shadow})}
      ></div>
      <textarea
        autocomplete=${Ve(this.autocomplete)}
        ?autofocus=${this.autofocus}
        ?disabled=${this.disabled}
        aria-label=${this.label}
        id="textarea"
        class=${De({monospace:this.monospace,"cursor-pointer":this._textareaPointerCursor})}
        maxlength=${Ve(this.maxLength)}
        minlength=${Ve(this.minLength)}
        rows=${Ve(this.rows)}
        cols=${Ve(this.cols)}
        name=${Ve(this.name)}
        placeholder=${Ve(this.placeholder)}
        ?readonly=${this.readonly}
        .style=${Le({resize:this.resize})}
        ?required=${this.required}
        spellcheck=${this.spellcheck}
        @change=${this._handleChange}
        @input=${this._handleInput}
        @mousemove=${this._handleMouseMove}
        @scroll=${this._handleScroll}
        .value=${this._value}
      ></textarea>
    `}};ai.styles=ni,ai.formAssociated=!0,ai.shadowRootOptions={...ue.shadowRootOptions,delegatesFocus:!0},ri([ge()],ai.prototype,"autocomplete",void 0),ri([ge({type:Boolean,reflect:!0})],ai.prototype,"autofocus",void 0),ri([ge({attribute:"default-value"})],ai.prototype,"defaultValue",void 0),ri([ge({type:Boolean,reflect:!0})],ai.prototype,"disabled",void 0),ri([ge({type:Boolean,reflect:!0})],ai.prototype,"invalid",void 0),ri([ge({attribute:!1})],ai.prototype,"label",void 0),ri([ge({type:Number})],ai.prototype,"maxLength",void 0),ri([ge({type:Number})],ai.prototype,"minLength",void 0),ri([ge({type:Number})],ai.prototype,"rows",void 0),ri([ge({type:Number})],ai.prototype,"cols",void 0),ri([ge()],ai.prototype,"name",void 0),ri([ge()],ai.prototype,"placeholder",void 0),ri([ge({type:Boolean,reflect:!0})],ai.prototype,"readonly",void 0),ri([ge()],ai.prototype,"resize",void 0),ri([ge({type:Boolean,reflect:!0})],ai.prototype,"required",void 0),ri([ge({type:Boolean})],ai.prototype,"spellcheck",void 0),ri([ge({type:Boolean,reflect:!0})],ai.prototype,"monospace",void 0),ri([ge()],ai.prototype,"value",null),ri([ye("#textarea")],ai.prototype,"_textareaEl",void 0),ri([_e()],ai.prototype,"_value",void 0),ri([_e()],ai.prototype,"_textareaPointerCursor",void 0),ri([_e()],ai.prototype,"_shadow",void 0),ai=ri([Ie("vscode-textarea")],ai);const li=n(Ae()),ci=[Ee,r`
    :host {
      display: inline-block;
      width: 320px;
    }

    .root {
      align-items: center;
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border-color: var(
        --vscode-settings-textInputBorder,
        var(--vscode-settings-textInputBackground, #3c3c3c)
      );
      border-radius: 4px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: flex;
      max-width: 100%;
      position: relative;
      width: 100%;
    }

    :host([focused]) .root {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    :host([invalid]),
    :host(:invalid) {
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    :host([invalid]) input,
    :host(:invalid) input {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
    }

    ::slotted([slot='content-before']) {
      display: block;
      margin-left: 2px;
    }

    ::slotted([slot='content-after']) {
      display: block;
      margin-right: 2px;
    }

    slot[name='content-before'],
    slot[name='content-after'] {
      align-items: center;
      display: flex;
    }

    input {
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border: 0;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, ${li});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, 'normal');
      line-height: 18px;
      outline: none;
      padding-bottom: 3px;
      padding-left: 4px;
      padding-right: 4px;
      padding-top: 3px;
      width: 100%;
    }

    input:read-only:not([type='file']) {
      cursor: not-allowed;
    }

    input::placeholder {
      color: var(--vscode-input-placeholderForeground, #989898);
      opacity: 1;
    }

    input[type='file'] {
      line-height: 24px;
      padding-bottom: 0;
      padding-left: 2px;
      padding-top: 0;
    }

    input[type='file']::file-selector-button {
      background-color: var(--vscode-button-background, #0078d4);
      border: 0;
      border-radius: 2px;
      color: var(--vscode-button-foreground, #ffffff);
      cursor: pointer;
      font-family: var(--vscode-font-family, ${li});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, 'normal');
      line-height: 20px;
      padding: 0 14px;
    }

    input[type='file']::file-selector-button:hover {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
    }
  `];var di=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let hi=class extends $e{set type(e){this._type=["color","date","datetime-local","email","file","month","number","password","search","tel","text","time","url","week"].includes(e)?e:"text"}get type(){return this._type}set value(e){"file"!==this.type&&(this._value=e,this._internals.setFormValue(e)),this.updateComplete.then(()=>{this._setValidityFromInput()})}get value(){return this._value}set minlength(e){this.minLength=e}get minlength(){return this.minLength}set maxlength(e){this.maxLength=e}get maxlength(){return this.maxLength}get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._setValidityFromInput(),this._internals.checkValidity()}reportValidity(){return this._setValidityFromInput(),this._internals.reportValidity()}get wrappedElement(){return this._inputEl}constructor(){super(),this.autocomplete=void 0,this.autofocus=!1,this.defaultValue="",this.disabled=!1,this.focused=!1,this.invalid=!1,this.label="",this.max=void 0,this.maxLength=void 0,this.min=void 0,this.minLength=void 0,this.multiple=!1,this.name=void 0,this.pattern=void 0,this.placeholder=void 0,this.readonly=!1,this.required=!1,this.step=void 0,this._value="",this._type="text",this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._inputEl.checkValidity(),this._setValidityFromInput(),this._internals.setFormValue(this._inputEl.value)})}attributeChangedCallback(e,t,o){super.attributeChangedCallback(e,t,o),["max","maxlength","min","minlength","pattern","required","step"].includes(e)&&this.updateComplete.then(()=>{this._setValidityFromInput()})}formResetCallback(){this.value=this.defaultValue,this.requestUpdate()}formStateRestoreCallback(e,t){this.value=e}_dataChanged(){if(this._value=this._inputEl.value,"file"===this.type&&this._inputEl.files)for(const e of this._inputEl.files)this._internals.setFormValue(e);else this._internals.setFormValue(this._inputEl.value)}_setValidityFromInput(){this._inputEl&&this._internals.setValidity(this._inputEl.validity,this._inputEl.validationMessage,this._inputEl)}_onInput(){this._dataChanged(),this._setValidityFromInput()}_onChange(){this._dataChanged(),this._setValidityFromInput(),this.dispatchEvent(new Event("change"))}_onFocus(){this.focused=!0}_onBlur(){this.focused=!1}_onKeyDown(e){"Enter"===e.key&&this._internals.form&&this._internals.form?.requestSubmit()}render(){return W`
      <div class="root">
        <slot name="content-before"></slot>
        <input
          id="input"
          type=${this.type}
          ?autofocus=${this.autofocus}
          autocomplete=${Ve(this.autocomplete)}
          aria-label=${this.label}
          ?disabled=${this.disabled}
          max=${Ve(this.max)}
          maxlength=${Ve(this.maxLength)}
          min=${Ve(this.min)}
          minlength=${Ve(this.minLength)}
          ?multiple=${this.multiple}
          name=${Ve(this.name)}
          pattern=${Ve(this.pattern)}
          placeholder=${Ve(this.placeholder)}
          ?readonly=${this.readonly}
          ?required=${this.required}
          step=${Ve(this.step)}
          .value=${this._value}
          @blur=${this._onBlur}
          @change=${this._onChange}
          @focus=${this._onFocus}
          @input=${this._onInput}
          @keydown=${this._onKeyDown}
        />
        <slot name="content-after"></slot>
      </div>
    `}};hi.styles=ci,hi.formAssociated=!0,hi.shadowRootOptions={...ue.shadowRootOptions,delegatesFocus:!0},di([ge()],hi.prototype,"autocomplete",void 0),di([ge({type:Boolean,reflect:!0})],hi.prototype,"autofocus",void 0),di([ge({attribute:"default-value"})],hi.prototype,"defaultValue",void 0),di([ge({type:Boolean,reflect:!0})],hi.prototype,"disabled",void 0),di([ge({type:Boolean,reflect:!0})],hi.prototype,"focused",void 0),di([ge({type:Boolean,reflect:!0})],hi.prototype,"invalid",void 0),di([ge({attribute:!1})],hi.prototype,"label",void 0),di([ge({type:Number})],hi.prototype,"max",void 0),di([ge({type:Number})],hi.prototype,"maxLength",void 0),di([ge({type:Number})],hi.prototype,"min",void 0),di([ge({type:Number})],hi.prototype,"minLength",void 0),di([ge({type:Boolean,reflect:!0})],hi.prototype,"multiple",void 0),di([ge({reflect:!0})],hi.prototype,"name",void 0),di([ge()],hi.prototype,"pattern",void 0),di([ge()],hi.prototype,"placeholder",void 0),di([ge({type:Boolean,reflect:!0})],hi.prototype,"readonly",void 0),di([ge({type:Boolean,reflect:!0})],hi.prototype,"required",void 0),di([ge({type:Number})],hi.prototype,"step",void 0),di([ge({reflect:!0})],hi.prototype,"type",null),di([ge()],hi.prototype,"value",null),di([ye("#input")],hi.prototype,"_inputEl",void 0),di([_e()],hi.prototype,"_value",void 0),di([_e()],hi.prototype,"_type",void 0),hi=di([Ie("vscode-textfield")],hi);const pi=[Ee,r`
    :host {
      display: inline-flex;
    }

    button {
      align-items: center;
      background-color: transparent;
      border: 0;
      border-radius: 5px;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      outline-offset: -1px;
      outline-width: 1px;
      padding: 0;
      user-select: none;
    }

    button:focus-visible {
      outline-color: var(--vscode-focusBorder, #0078d4);
      outline-style: solid;
    }

    button:hover {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
      outline-style: dashed;
      outline-color: var(--vscode-toolbar-hoverOutline, transparent);
    }

    button:active {
      background-color: var(
        --vscode-toolbar-activeBackground,
        rgba(99, 102, 103, 0.31)
      );
    }

    button.checked {
      background-color: var(
        --vscode-inputOption-activeBackground,
        rgba(36, 137, 219, 0.51)
      );
      outline-color: var(--vscode-inputOption-activeBorder, #2488db);
      outline-style: solid;
      color: var(--vscode-inputOption-activeForeground, #ffffff);
    }

    button.checked vscode-icon {
      color: var(--vscode-inputOption-activeForeground, #ffffff);
    }

    vscode-icon {
      display: block;
      padding: 3px;
    }

    slot:not(.empty) {
      align-items: center;
      display: flex;
      height: 22px;
      padding: 0 5px 0 2px;
    }

    slot.textOnly:not(.empty) {
      padding: 0 5px;
    }
  `];var ui=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};let vi=class extends $e{constructor(){super(...arguments),this.icon="",this.label=void 0,this.toggleable=!1,this.checked=!1,this._isSlotEmpty=!0}_handleSlotChange(){this._isSlotEmpty=!((this._assignedNodes?.length??0)>0)}_handleButtonClick(){this.toggleable&&(this.checked=!this.checked,this.dispatchEvent(new Event("change")))}render(){const e=this.checked?"true":"false";return W`
      <button
        type="button"
        aria-label=${Ve(this.label)}
        role=${Ve(this.toggleable?"switch":void 0)}
        aria-checked=${Ve(this.toggleable?e:void 0)}
        class=${De({checked:this.toggleable&&this.checked})}
        @click=${this._handleButtonClick}
      >
        ${this.icon?W`<vscode-icon name=${this.icon}></vscode-icon>`:Y}
        <slot
          @slotchange=${this._handleSlotChange}
          class=${De({empty:this._isSlotEmpty,textOnly:!this.icon})}
        ></slot>
      </button>
    `}};vi.styles=pi,ui([ge({reflect:!0})],vi.prototype,"icon",void 0),ui([ge()],vi.prototype,"label",void 0),ui([ge({type:Boolean,reflect:!0})],vi.prototype,"toggleable",void 0),ui([ge({type:Boolean,reflect:!0})],vi.prototype,"checked",void 0),ui([_e()],vi.prototype,"_isSlotEmpty",void 0),ui([function(e){return(t,o)=>{const{slot:i}={},s="slot"+(i?`[name=${i}]`:":not([name])");return me(t,o,{get(){const t=this.renderRoot?.querySelector(s);return t?.assignedNodes(e)??[]}})}}()],vi.prototype,"_assignedNodes",void 0),vi=ui([Ie("vscode-toolbar-button")],vi);const bi=[Ee,r`
    :host {
      display: block;
    }

    div {
      gap: 4px;
      display: flex;
      align-items: center;
    }
  `];let fi=class extends $e{render(){return W`<div><slot></slot></div>`}};fi.styles=bi,fi=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r}([Ie("vscode-toolbar-container")],fi);class gi extends Event{constructor(e,t,o,i){super("context-request",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=t,this.callback=o,this.subscribe=i??!1}}class _i{constructor(e,t,o,i){if(this.subscribe=!1,this.provided=!1,this.value=void 0,this.t=(e,t)=>{this.unsubscribe&&(this.unsubscribe!==t&&(this.provided=!1,this.unsubscribe()),this.subscribe||this.unsubscribe()),this.value=e,this.host.requestUpdate(),this.provided&&!this.subscribe||(this.provided=!0,this.callback&&this.callback(e,t)),this.unsubscribe=t},this.host=e,void 0!==t.context){const e=t;this.context=e.context,this.callback=e.callback,this.subscribe=e.subscribe??!1}else this.context=t,this.callback=o,this.subscribe=i??!1;this.host.addController(this)}hostConnected(){this.dispatchRequest()}hostDisconnected(){this.unsubscribe&&(this.unsubscribe(),this.unsubscribe=void 0)}dispatchRequest(){this.host.dispatchEvent(new gi(this.context,this.host,this.t,this.subscribe))}}class mi{get value(){return this.o}set value(e){this.setValue(e)}setValue(e,t=!1){const o=t||!Object.is(e,this.o);this.o=e,o&&this.updateObservers()}constructor(e){this.subscriptions=new Map,this.updateObservers=()=>{for(const[e,{disposer:t}]of this.subscriptions)e(this.o,t)},void 0!==e&&(this.value=e)}addCallback(e,t,o){if(!o)return void e(this.value);this.subscriptions.has(e)||this.subscriptions.set(e,{disposer:()=>{this.subscriptions.delete(e)},consumerHost:t});const{disposer:i}=this.subscriptions.get(e);e(this.value,i)}clearCallbacks(){this.subscriptions.clear()}}class yi extends Event{constructor(e,t){super("context-provider",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=t}}class xi extends mi{constructor(e,t,o){super(void 0!==t.context?t.initialValue:o),this.onContextRequest=e=>{if(e.context!==this.context)return;const t=e.contextTarget??e.composedPath()[0];t!==this.host&&(e.stopPropagation(),this.addCallback(e.callback,t,e.subscribe))},this.onProviderRequest=e=>{if(e.context!==this.context)return;if((e.contextTarget??e.composedPath()[0])===this.host)return;const t=new Set;for(const[e,{consumerHost:o}]of this.subscriptions)t.has(e)||(t.add(e),o.dispatchEvent(new gi(this.context,o,e,!0)));e.stopPropagation()},this.host=e,void 0!==t.context?this.context=t.context:this.context=t,this.attachListeners(),this.host.addController?.(this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new yi(this.context,this.host))}}function wi({context:e}){return(t,o)=>{const i=new WeakMap;if("object"==typeof o)return{get(){return t.get.call(this)},set(e){return i.get(this).setValue(e),t.set.call(this,e)},init(t){return i.set(this,new xi(this,{context:e,initialValue:t})),t}};{t.constructor.addInitializer(t=>{i.set(t,new xi(t,{context:e}))});const s=Object.getOwnPropertyDescriptor(t,o);let n;if(void 0===s){const e=new WeakMap;n={get(){return e.get(this)},set(t){i.get(this).setValue(t),e.set(this,t)},configurable:!0,enumerable:!0}}else{const e=s.set;n={...s,set(t){i.get(this).setValue(t),e?.call(this,t)}}}return void Object.defineProperty(t,o,n)}}}function ki({context:e,subscribe:t}){return(o,i)=>{"object"==typeof i?i.addInitializer(function(){new _i(this,{context:e,callback:e=>{o.set.call(this,e)},subscribe:t})}):o.constructor.addInitializer(o=>{new _i(o,{context:e,callback:e=>{o[i]=e},subscribe:t})})}}const Ci=[Ee,r`
    :host {
      --vsc-tree-item-arrow-display: flex;
      --internal-selectionBackground: var(
        --vscode-list-inactiveSelectionBackground,
        #37373d
      );
      --internal-selectionForeground: var(--vscode-foreground, #cccccc);
      --internal-selectionIconForeground: var(
        --vscode-icon-foreground,
        #cccccc
      );
      --internal-defaultIndentGuideDisplay: none;
      --internal-highlightedIndentGuideDisplay: block;

      display: block;
    }

    :host(:hover) {
      --internal-defaultIndentGuideDisplay: block;
      --internal-highlightedIndentGuideDisplay: block;
    }

    :host(:focus-within) {
      --internal-selectionBackground: var(
        --vscode-list-activeSelectionBackground,
        #04395e
      );
      --internal-selectionForeground: var(
        --vscode-list-activeSelectionForeground,
        #ffffff
      );
      --internal-selectionIconForeground: var(
        --vscode-list-activeSelectionIconForeground,
        #ffffff
      );
    }

    :host([hide-arrows]) {
      --vsc-tree-item-arrow-display: none;
    }

    :host([indent-guides='none']),
    :host([indent-guides='none']:hover) {
      --internal-defaultIndentGuideDisplay: none;
      --internal-highlightedIndentGuideDisplay: none;
    }

    :host([indent-guides='always']),
    :host([indent-guides='always']:hover) {
      --internal-defaultIndentGuideDisplay: block;
      --internal-highlightedIndentGuideDisplay: block;
    }
  `],Si="vscode-list",$i=Symbol("configContext"),Ii=e=>e instanceof Element&&e.matches("vscode-tree-item"),Ei=(e,t)=>{const o=t.length,i=(s=e)instanceof Element&&s.matches("vscode-tree")?-1:e.level;var s;"branch"in e&&(e.branch=o>0),t.forEach((t,o)=>{t.path="path"in e?[...e.path,o]:[o],t.level=i+1,t.dataset.path=t.path.join(".")})},Ai=e=>{const t=e.lastElementChild;return t&&Ii(t)?t.branch&&t.open?Ai(t):t:e},Pi=e=>{if(!e.parentElement)return null;if(!Ii(e.parentElement))return null;return Oi(e.parentElement)||Pi(e.parentElement)},Oi=e=>{let t=e.nextElementSibling;for(;t&&!Ii(t);)t=t.nextElementSibling;return t};function Ri(e){return e.parentElement&&Ii(e.parentElement)?e.parentElement:null}var Bi=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};const zi="none",Di=[" ","ArrowDown","ArrowUp","ArrowLeft","ArrowRight","Enter","Escape","Shift"];let Vi=class extends $e{constructor(){super(),this.expandMode="singleClick",this.hideArrows=!1,this.indent=8,this.indentGuides="onHover",this.multiSelect=!1,this._treeContextState={isShiftPressed:!1,activeItem:null,selectedItems:new Set,hoveredItem:null,allItems:null,itemListUpToDate:!1,focusedItem:null,prevFocusedItem:null,hasBranchItem:!1,rootElement:this,highlightedItems:new Set,highlightIndentGuides:()=>{this._highlightIndentGuides()},emitSelectEvent:()=>{this._emitSelectEvent()}},this._configContext={hideArrows:this.hideArrows,expandMode:this.expandMode,indent:this.indent,indentGuides:this.indentGuides,multiSelect:this.multiSelect},this._handleComponentKeyDown=e=>{const t=e.key;switch(Di.includes(t)&&(e.stopPropagation(),e.preventDefault()),t){case" ":case"Enter":this._handleEnterPress();break;case"ArrowDown":this._handleArrowDownPress();break;case"ArrowLeft":this._handleArrowLeftPress(e);break;case"ArrowRight":this._handleArrowRightPress();break;case"ArrowUp":this._handleArrowUpPress();break;case"Shift":this._handleShiftPress()}},this._handleComponentKeyUp=e=>{"Shift"===e.key&&(this._treeContextState.isShiftPressed=!1)},this._handleSlotChange=()=>{this._treeContextState.itemListUpToDate=!1,Ei(this,this._assignedTreeItems),this.updateComplete.then(()=>{if(null===this._treeContextState.activeItem){const e=this.querySelector(":scope > vscode-tree-item");e&&(e.active=!0)}})},this.addEventListener("keyup",this._handleComponentKeyUp),this.addEventListener("keydown",this._handleComponentKeyDown)}connectedCallback(){super.connectedCallback(),this.role="tree"}willUpdate(e){this._updateConfigContext(e),e.has("multiSelect")&&(this.ariaMultiSelectable=this.multiSelect?"true":"false")}expandAll(){this.querySelectorAll("vscode-tree-item").forEach(e=>{e.branch&&(e.open=!0)})}collapseAll(){this.querySelectorAll("vscode-tree-item").forEach(e=>{e.branch&&(e.open=!1)})}updateHasBranchItemFlag(){const e=this._assignedTreeItems.some(e=>e.branch);this._treeContextState={...this._treeContextState,hasBranchItem:e}}_emitSelectEvent(){const e=new CustomEvent("vsc-tree-select",{detail:Array.from(this._treeContextState.selectedItems)});this.dispatchEvent(e)}_highlightIndentGuideOfItem(e){if(e.branch&&e.open)e.highlightedGuides=!0,this._treeContextState.highlightedItems?.add(e);else{const t=Ri(e);t&&(t.highlightedGuides=!0,this._treeContextState.highlightedItems?.add(t))}}_highlightIndentGuides(){this.indentGuides!==zi&&(this._treeContextState.highlightedItems?.forEach(e=>e.highlightedGuides=!1),this._treeContextState.highlightedItems?.clear(),this._treeContextState.activeItem&&this._highlightIndentGuideOfItem(this._treeContextState.activeItem),this._treeContextState.selectedItems.forEach(e=>{this._highlightIndentGuideOfItem(e)}))}_updateConfigContext(e){const{hideArrows:t,expandMode:o,indent:i,indentGuides:s,multiSelect:n}=this;e.has("hideArrows")&&(this._configContext={...this._configContext,hideArrows:t}),e.has("expandMode")&&(this._configContext={...this._configContext,expandMode:o}),e.has("indent")&&(this._configContext={...this._configContext,indent:i}),e.has("indentGuides")&&(this._configContext={...this._configContext,indentGuides:s}),e.has("multiSelect")&&(this._configContext={...this._configContext,multiSelect:n})}_focusItem(e){e.active=!0,e.updateComplete.then(()=>{e.focus(),this._highlightIndentGuides()})}_focusPrevItem(){if(this._treeContextState.focusedItem){const e=(e=>{const{parentElement:t}=e;if(!t||!Ii(e))return null;let o=e.previousElementSibling;for(;o&&!Ii(o);)o=o.previousElementSibling;return!o&&Ii(t)?t:o&&o.branch&&o.open?Ai(o):o})(this._treeContextState.focusedItem);e&&(this._focusItem(e),this._treeContextState.isShiftPressed&&this.multiSelect&&(e.selected=!e.selected,this._emitSelectEvent()))}}_focusNextItem(){if(this._treeContextState.focusedItem){const e=(e=>{const{parentElement:t}=e;if(!t||!Ii(e))return null;let o;if(e.branch&&e.open){const t=e.querySelector("vscode-tree-item");t?o=t:(o=Oi(e),o||(o=Pi(e)))}else o=Oi(e),o||(o=Pi(e));return o||e})(this._treeContextState.focusedItem);e&&(this._focusItem(e),this._treeContextState.isShiftPressed&&this.multiSelect&&(e.selected=!e.selected,this._emitSelectEvent()))}}_handleArrowRightPress(){if(!this._treeContextState.focusedItem)return;const{focusedItem:e}=this._treeContextState;e.branch&&(e.open?this._focusNextItem():e.open=!0)}_handleArrowLeftPress(e){if(e.ctrlKey)return void this.collapseAll();if(!this._treeContextState.focusedItem)return;const{focusedItem:t}=this._treeContextState,o=Ri(t);t.branch&&t.open?t.open=!1:o&&o.branch&&this._focusItem(o)}_handleArrowDownPress(){this._treeContextState.focusedItem?this._focusNextItem():this._focusItem(this._assignedTreeItems[0])}_handleArrowUpPress(){this._treeContextState.focusedItem?this._focusPrevItem():this._focusItem(this._assignedTreeItems[0])}_handleEnterPress(){const{focusedItem:e}=this._treeContextState;e&&(this._treeContextState.selectedItems.forEach(e=>e.selected=!1),this._treeContextState.selectedItems.clear(),this._highlightIndentGuides(),e.selected=!0,this._emitSelectEvent(),e.branch&&(e.open=!e.open))}_handleShiftPress(){this._treeContextState.isShiftPressed=!0}render(){return W`<div>
      <slot @slotchange=${this._handleSlotChange}></slot>
    </div>`}};Vi.styles=Ci,Bi([ge({type:String,attribute:"expand-mode"})],Vi.prototype,"expandMode",void 0),Bi([ge({type:Boolean,reflect:!0,attribute:"hide-arrows"})],Vi.prototype,"hideArrows",void 0),Bi([ge({type:Number,reflect:!0})],Vi.prototype,"indent",void 0),Bi([ge({type:String,attribute:"indent-guides",useDefault:!0,reflect:!0})],Vi.prototype,"indentGuides",void 0),Bi([ge({type:Boolean,reflect:!0,attribute:"multi-select"})],Vi.prototype,"multiSelect",void 0),Bi([wi({context:Si})],Vi.prototype,"_treeContextState",void 0),Bi([wi({context:$i})],Vi.prototype,"_configContext",void 0),Bi([we({selector:"vscode-tree-item"})],Vi.prototype,"_assignedTreeItems",void 0),Vi=Bi([Ie("vscode-tree")],Vi);const Li=[Ee,r`
    :host {
      --hover-outline-color: transparent;
      --hover-outline-style: solid;
      --hover-outline-width: 0;

      --selected-outline-color: transparent;
      --selected-outline-style: solid;
      --selected-outline-width: 0;

      cursor: pointer;
      display: block;
      user-select: none;
    }

    ::slotted(vscode-icon) {
      display: block;
    }

    .root {
      display: block;
    }

    .wrapper {
      align-items: flex-start;
      color: var(--vscode-foreground, #cccccc);
      display: flex;
      flex-wrap: nowrap;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 22px;
      min-height: 22px;
      outline-offset: -1px;
      padding-right: 12px;
    }

    .wrapper:hover {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      color: var(
        --vscode-list-hoverForeground,
        var(--vscode-foreground, #cccccc)
      );
    }

    :host([selected]) .wrapper {
      color: var(--internal-selectionForeground);
      background-color: var(--internal-selectionBackground);
    }

    :host([selected]) ::slotted(vscode-icon) {
      color: var(--internal-selectionForeground);
    }

    :host(:focus) {
      outline: none;
    }

    :host(:focus) .wrapper.active {
      outline-color: var(
        --vscode-list-focusAndSelectionOutline,
        var(--vscode-list-focusOutline, #0078d4)
      );
      outline-style: solid;
      outline-width: 1px;
    }

    .arrow-container {
      align-items: center;
      display: var(--vsc-tree-item-arrow-display);
      height: 22px;
      justify-content: center;
      padding-left: 8px;
      padding-right: 6px;
      width: 16px;
    }

    .arrow-container svg {
      display: block;
      fill: var(--vscode-icon-foreground, #cccccc);
    }

    .arrow-container.icon-rotated svg {
      transform: rotate(90deg);
    }

    :host([selected]) .arrow-container svg {
      fill: var(--internal-selectionIconForeground);
    }

    .icon-container {
      align-items: center;
      display: flex;
      justify-content: center;
      margin-right: 3px;
      min-height: 22px;
      overflow: hidden;
    }

    .icon-container slot {
      display: block;
    }

    .icon-container.has-icon {
      min-width: 22px;
      max-width: 22px;
      max-height: 22px;
    }

    :host(:is(:--show-actions, :state(show-actions))) .icon-container {
      overflow: visible;
    }

    .children {
      position: relative;
    }

    .children.guide:before {
      background-color: var(
        --vscode-tree-inactiveIndentGuidesStroke,
        rgba(88, 88, 88, 0.4)
      );
      content: '';
      display: none;
      height: 100%;
      left: var(--indentation-guide-left);
      pointer-events: none;
      position: absolute;
      width: 1px;
      z-index: 1;
    }

    .children.guide.default-guide:before {
      display: var(--internal-defaultIndentGuideDisplay);
    }

    .children.guide.highlighted-guide:before {
      display: var(--internal-highlightedIndentGuideDisplay);
      background-color: var(--vscode-tree-indentGuidesStroke, #585858);
    }

    .content {
      display: flex;
      align-items: center;
      flex-wrap: nowrap; /* prevent wrapping; allow ellipses via min-width: 0 */
      min-width: 0;
      width: 100%;
      line-height: 22px;
    }

    .label {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .description {
      color: var(--vscode-foreground, #cccccc);
      opacity: 0.7;
      display: none;
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .content.has-description .description {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      flex: 1 1 0%; /* description takes remaining space, yields first when shrinking */
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-left: 0.5em;
    }

    .content.has-description .label {
      flex: 0 1 auto; /* label only grows when description missing */
    }

    .content:not(.has-description) .label {
      flex: 1 1 auto;
    }

    .label ::slotted(*) {
      display: inline-block;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .description ::slotted(*) {
      display: inline-block;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      align-items: center;
      align-self: center;
      display: none;
      flex: 0 0 auto;
      gap: 2px;
      margin-left: auto;
      min-height: 22px;
      color: inherit;
    }

    .actions ::slotted(*) {
      align-items: center;
      display: inline-flex;
      height: 22px;
    }

    .actions ::slotted(button) {
      cursor: pointer;
    }

    .actions ::slotted([hidden]) {
      display: none !important;
    }

    :host(
        :is(
          :--has-actions:--show-actions,
          :--has-actions:state(show-actions),
          :state(has-actions):--show-actions,
          :state(has-actions):state(show-actions)
        )
      )
      .actions {
      display: inline-flex;
    }

    .decoration {
      align-items: center;
      align-self: center;
      color: inherit;
      display: none;
      flex: 0 0 auto;
      gap: 4px;
      margin-left: auto;
      min-height: 22px;
    }

    :host(:is(:--has-decoration, :state(has-decoration))) .decoration {
      display: inline-flex;
    }

    :host(:is(:--show-actions, :state(show-actions))) .decoration {
      margin-left: 6px;
    }

    :host([selected]) ::slotted([slot='decoration']),
    :host([selected]) ::slotted([slot='decoration']) * {
      color: inherit !important;
    }

    :host([selected]) .description {
      color: var(--internal-selectionForeground, #ffffff);
      opacity: 0.8;
    }

    :host([selected]) :is(:state(focus-visible), :--focus-visible) .description,
    :host([selected]:focus-within) .description {
      opacity: 0.95;
    }

    :host([branch]) ::slotted(vscode-tree-item) {
      display: none;
    }

    :host([branch][open]) ::slotted(vscode-tree-item) {
      display: block;
    }
  `];var Fi,Mi=function(e,t,o,i){var s,n=arguments.length,r=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,o,i);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,o,r):s(t,o))||r);return n>3&&r&&Object.defineProperty(t,o,r),r};const Ti=W`<svg
  width="16"
  height="16"
  viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619 4.357-4.357z"
  />
</svg>`;let Hi=Fi=class extends $e{set selected(e){this._selected=e,e?this._treeContextState.selectedItems.add(this):this._treeContextState.selectedItems.delete(this),this.ariaSelected=e?"true":"false",this._updateActionsVisibility()}get selected(){return this._selected}set path(e){this._path=e}get path(){return this._path}constructor(){super(),this.active=!1,this.branch=!1,this.hasActiveItem=!1,this.hasSelectedItem=!1,this.highlightedGuides=!1,this.open=!1,this.level=0,this._selected=!1,this._path=[],this._hasBranchIcon=!1,this._hasBranchOpenedIcon=!1,this._hasLeafIcon=!1,this._hasDescriptionSlotContent=!1,this._hasActionsSlotContent=!1,this._hasDecorationSlotContent=!1,this._treeContextState={isShiftPressed:!1,selectedItems:new Set,hoveredItem:null,allItems:null,itemListUpToDate:!1,focusedItem:null,prevFocusedItem:null,hasBranchItem:!1,rootElement:null,activeItem:null},this._isPointerInside=!1,this._hasKeyboardFocus=!1,this._handleMainSlotChange=()=>{this._mainSlotChange(),this._treeContextState.itemListUpToDate=!1},this._handleComponentFocus=()=>{this._treeContextState.focusedItem&&this._treeContextState.focusedItem!==this&&(this._treeContextState.isShiftPressed||(this._treeContextState.prevFocusedItem=this._treeContextState.focusedItem),this._treeContextState.focusedItem=null),this._treeContextState.focusedItem=this},this._handlePointerEnter=()=>{this._isPointerInside=!0,this._claimHover()},this._handlePointerLeave=e=>{this._isPointerInside=!1,this._treeContextState.hoveredItem===this&&(this._treeContextState.hoveredItem=null),this._clearHoverState();const t=e.relatedTarget;if(t instanceof Element){const e=t.closest("vscode-tree-item");e&&e!==this&&e.isConnected&&e._adoptHoverFromSibling()}},this._handleFocusIn=()=>{this._updateFocusState()},this._handleFocusOut=()=>{this._updateFocusState()},this._internals=this.attachInternals(),this.addEventListener("focus",this._handleComponentFocus),this.addEventListener("pointerenter",this._handlePointerEnter),this.addEventListener("pointerleave",this._handlePointerLeave),this.addEventListener("focusin",this._handleFocusIn),this.addEventListener("focusout",this._handleFocusOut)}connectedCallback(){super.connectedCallback(),this._mainSlotChange(),this.role="treeitem",this.ariaDisabled="false"}firstUpdated(e){super.firstUpdated(e),this._refreshDescriptionSlotState(),this._refreshActionsSlotState(),this._refreshDecorationSlotState(),this.matches(":hover")?(this._isPointerInside=!0,this._claimHover()):this._updateActionsVisibility()}willUpdate(e){e.has("active")&&this._toggleActiveState(),(e.has("open")||e.has("branch"))&&this._setAriaExpanded()}_setAriaExpanded(){this.branch?this.ariaExpanded=this.open?"true":"false":this.ariaExpanded=null}_setHasActiveItemFlagOnParent(e,t){const o=function(e){return e.parentElement&&e.parentElement instanceof Hi?e.parentElement:null}(e);o&&(o.hasActiveItem=t)}_refreshDescriptionSlotState(){const e=(this._descriptionSlotElements?.length??0)>0;this._hasDescriptionSlotContent=e,this._setCustomState("has-description",e)}_refreshActionsSlotState(){const e=(this._actionsSlotElements?.length??0)>0;this._hasActionsSlotContent=e,this._setCustomState("has-actions",e),this._updateActionsVisibility()}_refreshDecorationSlotState(){const e=(this._decorationSlotElements?.length??0)>0,t=this._hasDecorationSlotContent;this._hasDecorationSlotContent=e,this._setCustomState("has-decoration",e),t!==e&&this.requestUpdate()}_setCustomState(e,t){if(this._internals?.states)try{t?this._internals.states.add(e):this._internals.states.delete(e)}catch{t?this._internals.states.add(`--${e}`):this._internals.states.delete(`--${e}`)}}_getActiveElement(){const e=this.getRootNode({composed:!0});return e instanceof Document?e.activeElement instanceof Element?e.activeElement:null:e instanceof ShadowRoot&&e.activeElement instanceof Element?e.activeElement:null}_isActiveElementInActions(e){return!!e&&(this._actionsSlotElements??[]).some(t=>t===e||t.contains(e))}_updateActionsVisibility(){if(!this._hasActionsSlotContent)return void this._setCustomState("show-actions",!1);const e=this._getActiveElement(),t=this._isActiveElementInActions(e),o=this.selected||this._isPointerInside||this._hasKeyboardFocus||t;this._setCustomState("show-actions",o)}_updateFocusState(){const e=this.matches(":focus-visible");this._setCustomState("focus-visible",e);const t=this._getActiveElement();let o=null;if(t instanceof Element&&(o=t.closest("vscode-tree-item"),!o)){const e=t.getRootNode();e instanceof ShadowRoot&&e.host instanceof Fi&&(o=e.host)}const i=o===this;this._hasKeyboardFocus=i,this._setCustomState("keyboard-focus",i),this._updateActionsVisibility()}_clearHoverState(){this._isPointerInside=!1,this._setCustomState("hover",!1),this._updateActionsVisibility()}_adoptHoverFromSibling(){this._isPointerInside=!0,this._claimHover()}_claimHover(){const e=this._treeContextState;e.hoveredItem&&e.hoveredItem!==this&&e.hoveredItem._clearHoverState(),e.hoveredItem=this,this._setCustomState("hover",!0),this._updateActionsVisibility()}_toggleActiveState(){this.active?(this._treeContextState.activeItem&&(this._treeContextState.activeItem.active=!1,this._setHasActiveItemFlagOnParent(this._treeContextState.activeItem,!1)),this._treeContextState.activeItem=this,this._setHasActiveItemFlagOnParent(this,!0),this.tabIndex=0,this._setCustomState("active",!0)):(this._treeContextState.activeItem===this&&(this._treeContextState.activeItem=null,this._setHasActiveItemFlagOnParent(this,!1)),this.tabIndex=-1,this._setCustomState("active",!1))}_selectItem(e){const{selectedItems:t}=this._treeContextState,{multiSelect:o}=this._configContext,i=new Set(t);o&&e?this.selected=!this.selected:(Array.from(t).forEach(e=>{e!==this&&(e.selected=!1)}),t.clear(),this.selected=!0);const s=new Set([...i,...t]);s.add(this),s.forEach(e=>e._updateActionsVisibility())}_selectRange(){const e=this._treeContextState.prevFocusedItem;if(!e||e===this)return;const t=new Set(this._treeContextState.selectedItems);this._treeContextState.itemListUpToDate||(this._treeContextState.allItems=this._treeContextState.rootElement.querySelectorAll("vscode-tree-item"),this._treeContextState.allItems&&this._treeContextState.allItems.forEach((e,t)=>{e.dataset.score=t.toString()}),this._treeContextState.itemListUpToDate=!0);let o=+(e.dataset.score??-1),i=+(this.dataset.score??-1);o>i&&([o,i]=[i,o]),Array.from(this._treeContextState.selectedItems).forEach(e=>e.selected=!1),this._treeContextState.selectedItems.clear(),this._selectItemsAndAllVisibleDescendants(o,i);const s=new Set([...t,...this._treeContextState.selectedItems]);s.add(this),s.forEach(e=>e._updateActionsVisibility())}_selectItemsAndAllVisibleDescendants(e,t){let o=e;for(;o<=t;)if(this._treeContextState.allItems){const e=this._treeContextState.allItems[o];e.branch&&!e.open?(e.selected=!0,o+=e.querySelectorAll("vscode-tree-item").length):e.branch&&e.open?(e.selected=!0,o+=this._selectItemsAndAllVisibleDescendants(o+1,t)):(e.selected=!0,o+=1)}return o}_mainSlotChange(){this._initiallyAssignedTreeItems.forEach(e=>{e.setAttribute("slot","children")})}_handleChildrenSlotChange(){Ei(this,this._childrenTreeItems),this._treeContextState.rootElement&&this._treeContextState.rootElement.updateHasBranchItemFlag()}_handleDescriptionSlotChange(){this._refreshDescriptionSlotState()}_handleActionsSlotChange(){this._refreshActionsSlotState()}_handleDecorationSlotChange(){this._refreshDecorationSlotState()}_handleContentClick(e){e.stopPropagation();const t=e.ctrlKey||e.metaKey,o=e.shiftKey;o&&this._configContext.multiSelect?(this._selectRange(),this._treeContextState.emitSelectEvent?.(),this.updateComplete.then(()=>{this._treeContextState.highlightIndentGuides?.()})):(this._selectItem(t),this._treeContextState.emitSelectEvent?.(),this.updateComplete.then(()=>{this._treeContextState.highlightIndentGuides?.()}),"singleClick"===this._configContext.expandMode&&(!this.branch||this._configContext.multiSelect&&t||(this.open=!this.open))),this.active=!0,o||(this._treeContextState.prevFocusedItem=this)}_handleDoubleClick(e){"doubleClick"===this._configContext.expandMode&&(!this.branch||this._configContext.multiSelect&&(e.ctrlKey||e.metaKey)||(this.open=!this.open))}_handleIconSlotChange(e){const t=e.target,o=t.assignedElements().length>0;switch(t.name){case"icon-branch":this._hasBranchIcon=o;break;case"icon-branch-opened":this._hasBranchOpenedIcon=o;break;case"icon-leaf":this._hasLeafIcon=o}}render(){const{hideArrows:e,indent:t,indentGuides:o}=this._configContext,{hasBranchItem:i}=this._treeContextState;let s=3+this.level*t;const n=e?3:13,r=3+this.level*t+n;this.branch||e||!i||(s+=30);const a=this._hasBranchIcon&&this.branch||this._hasBranchOpenedIcon&&this.branch&&this.open||this._hasLeafIcon&&!this.branch,l={wrapper:!0,active:this.active,"has-description":this._hasDescriptionSlotContent,"has-actions":this._hasActionsSlotContent,"has-decoration":this._hasDecorationSlotContent},c={children:!0,guide:o!==zi,"default-guide":o!==zi,"highlighted-guide":this.highlightedGuides},d={"icon-container":!0,"has-icon":a},h={content:!0,"has-description":this._hasDescriptionSlotContent,"has-decoration":this._hasDecorationSlotContent};return W` <div class="root">
      <div
        class=${De(l)}
        part="wrapper"
        @click=${this._handleContentClick}
        @dblclick=${this._handleDoubleClick}
        .style=${Le({paddingLeft:`${s}px`})}
      >
        ${this.branch&&!e?W`<div
              class=${De({"arrow-container":!0,"icon-rotated":this.open})}
              part="arrow-icon-container"
            >
              ${Ti}
            </div>`:Y}
        <div class=${De(d)} part="icon-container">
          ${this.branch&&!this.open?W`<slot
                name="icon-branch"
                @slotchange=${this._handleIconSlotChange}
              ></slot>`:Y}
          ${this.branch&&this.open?W`<slot
                name="icon-branch-opened"
                @slotchange=${this._handleIconSlotChange}
              ></slot>`:Y}
          ${this.branch?Y:W`<slot
                name="icon-leaf"
                @slotchange=${this._handleIconSlotChange}
              ></slot>`}
        </div>
        <div class=${De(h)} part="content">
          <span class="label" part="label">
            <slot @slotchange=${this._handleMainSlotChange}></slot>
          </span>
          <span
            class="description"
            part="description"
            ?hidden=${!this._hasDescriptionSlotContent}
          >
            <slot
              name="description"
              @slotchange=${this._handleDescriptionSlotChange}
            ></slot>
          </span>
          <div class="actions" part="actions">
            <slot
              name="actions"
              @slotchange=${this._handleActionsSlotChange}
            ></slot>
          </div>
          <div class="decoration" part="decoration">
            <slot
              name="decoration"
              @slotchange=${this._handleDecorationSlotChange}
            ></slot>
          </div>
        </div>
      </div>
      <div
        class=${De(c)}
        .style=${Le({"--indentation-guide-left":`${r}px`})}
        role="group"
        part="children"
      >
        <slot
          name="children"
          @slotchange=${this._handleChildrenSlotChange}
        ></slot>
      </div>
    </div>`}};Hi.styles=Li,Mi([ge({type:Boolean})],Hi.prototype,"active",void 0),Mi([ge({type:Boolean,reflect:!0})],Hi.prototype,"branch",void 0),Mi([ge({type:Boolean})],Hi.prototype,"hasActiveItem",void 0),Mi([ge({type:Boolean})],Hi.prototype,"hasSelectedItem",void 0),Mi([ge({type:Boolean})],Hi.prototype,"highlightedGuides",void 0),Mi([ge({type:Boolean,reflect:!0})],Hi.prototype,"open",void 0),Mi([ge({type:Number,reflect:!0})],Hi.prototype,"level",void 0),Mi([ge({type:Boolean,reflect:!0})],Hi.prototype,"selected",null),Mi([_e()],Hi.prototype,"_hasBranchIcon",void 0),Mi([_e()],Hi.prototype,"_hasBranchOpenedIcon",void 0),Mi([_e()],Hi.prototype,"_hasLeafIcon",void 0),Mi([_e()],Hi.prototype,"_hasDescriptionSlotContent",void 0),Mi([_e()],Hi.prototype,"_hasActionsSlotContent",void 0),Mi([_e()],Hi.prototype,"_hasDecorationSlotContent",void 0),Mi([ki({context:Si,subscribe:!0})],Hi.prototype,"_treeContextState",void 0),Mi([ki({context:$i,subscribe:!0})],Hi.prototype,"_configContext",void 0),Mi([we({selector:"vscode-tree-item"})],Hi.prototype,"_initiallyAssignedTreeItems",void 0),Mi([we({selector:"vscode-tree-item",slot:"children"})],Hi.prototype,"_childrenTreeItems",void 0),Mi([we({slot:"description",flatten:!0})],Hi.prototype,"_descriptionSlotElements",void 0),Mi([we({slot:"actions",flatten:!0})],Hi.prototype,"_actionsSlotElements",void 0),Mi([we({slot:"decoration",flatten:!0})],Hi.prototype,"_decorationSlotElements",void 0),Hi=Fi=Mi([Ie("vscode-tree-item")],Hi)})();
//# sourceMappingURL=configWebview.bundle.js.map