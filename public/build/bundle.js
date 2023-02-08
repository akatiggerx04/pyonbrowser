
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.55.1 */

    const { document: document_1 } = globals;
    const file = "src/App.svelte";

    // (90:2) {#if execute}
    function create_if_block_1(ctx) {
    	let button;
    	let i;
    	let t0;
    	let t1;
    	let t2;
    	let pre;
    	let code_1;
    	let t3;
    	let t4;
    	let script;
    	let mounted;
    	let dispose;
    	let if_block = /*code*/ ctx[0].length < 2000 && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			t0 = text(" Clear");
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			pre = element("pre");
    			code_1 = element("code");
    			t3 = text(/*code*/ ctx[0]);
    			t4 = space();
    			script = element("script");
    			script.textContent = "Prism.highlightAll();";
    			attr_dev(i, "class", "fa fa-trash");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 90, 40, 3171);
    			attr_dev(button, "class", "btn svelte-1msgwmh");
    			add_location(button, file, 90, 3, 3134);
    			attr_dev(code_1, "class", "language-python");
    			attr_dev(code_1, "id", "highlighted-code");
    			add_location(code_1, file, 109, 8, 4151);
    			add_location(pre, file, 109, 3, 4146);
    			add_location(script, file, 110, 3, 4226);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(button, t0);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, pre, anchor);
    			append_dev(pre, code_1);
    			append_dev(code_1, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, script, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*clear*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*code*/ ctx[0].length < 2000) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(t2.parentNode, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*code*/ 1) set_data_dev(t3, /*code*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(pre);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(script);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(90:2) {#if execute}",
    		ctx
    	});

    	return block;
    }

    // (92:3) {#if code.length < 2000 }
    function create_if_block_2(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let a0;
    	let span;
    	let t1;
    	let h5;
    	let t3;
    	let p;
    	let t5;
    	let div0;
    	let a1;
    	let t7;
    	let a2;
    	let t9;
    	let a3;
    	let button;
    	let i;
    	let t10;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			a0 = element("a");
    			span = element("span");
    			span.textContent = "×";
    			t1 = space();
    			h5 = element("h5");
    			h5.textContent = "Share Your Python Snippet";
    			t3 = space();
    			p = element("p");
    			p.textContent = "Get your hands on the link to your Python snippet by simply clicking on the 'Copy Link' button, and share it with others.";
    			t5 = space();
    			div0 = element("div");
    			a1 = element("a");
    			a1.textContent = "Close";
    			t7 = space();
    			a2 = element("a");
    			a2.textContent = "Copy Link";
    			t9 = space();
    			a3 = element("a");
    			button = element("button");
    			i = element("i");
    			t10 = text(" Share");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file, 96, 6, 3486);
    			attr_dev(a0, "href", "#close");
    			attr_dev(a0, "class", "close");
    			attr_dev(a0, "role", "button");
    			attr_dev(a0, "aria-label", "Close");
    			add_location(a0, file, 95, 6, 3415);
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file, 98, 6, 3543);
    			add_location(p, file, 99, 6, 3604);
    			attr_dev(a1, "href", "#close");
    			attr_dev(a1, "class", "btn mr-5");
    			attr_dev(a1, "role", "button");
    			add_location(a1, file, 101, 6, 3776);
    			attr_dev(a2, "href", "#close");
    			attr_dev(a2, "class", "btn btn-primary");
    			attr_dev(a2, "role", "button");
    			add_location(a2, file, 102, 6, 3840);
    			attr_dev(div0, "class", "text-right mt-20");
    			add_location(div0, file, 100, 6, 3739);
    			attr_dev(div1, "class", "modal-content");
    			add_location(div1, file, 94, 5, 3381);
    			attr_dev(div2, "class", "modal-dialog");
    			attr_dev(div2, "role", "document");
    			add_location(div2, file, 93, 5, 3333);
    			attr_dev(div3, "class", "modal");
    			attr_dev(div3, "id", "share-py");
    			attr_dev(div3, "tabindex", "-1");
    			attr_dev(div3, "role", "dialog");
    			add_location(div3, file, 92, 4, 3266);
    			attr_dev(i, "class", "fa fa-share-alt");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 107, 80, 4064);
    			attr_dev(button, "class", "btn svelte-1msgwmh");
    			add_location(button, file, 107, 38, 4022);
    			attr_dev(a3, "href", "#share-py");
    			attr_dev(a3, "role", "button");
    			add_location(a3, file, 107, 4, 3988);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, a0);
    			append_dev(a0, span);
    			append_dev(div1, t1);
    			append_dev(div1, h5);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    			append_dev(div1, t5);
    			append_dev(div1, div0);
    			append_dev(div0, a1);
    			append_dev(div0, t7);
    			append_dev(div0, a2);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, a3, anchor);
    			append_dev(a3, button);
    			append_dev(button, i);
    			append_dev(button, t10);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						a2,
    						"click",
    						function () {
    							if (is_function(copy(/*share_url*/ ctx[3]))) copy(/*share_url*/ ctx[3]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(button, "click", /*share_code*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(a3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(92:3) {#if code.length < 2000 }",
    		ctx
    	});

    	return block;
    }

    // (113:2) {#if !execute}
    function create_if_block(ctx) {
    	let p;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Code Examples:";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Hello world";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "1 + 1";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "Say Hello";
    			attr_dev(p, "class", "mt-0");
    			add_location(p, file, 113, 2, 4292);
    			attr_dev(button0, "class", "btn svelte-1msgwmh");
    			attr_dev(button0, "data-toggle", "tooltip");
    			attr_dev(button0, "data-title", "A simple Hello world Python script.");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file, 114, 2, 4329);
    			attr_dev(button1, "class", "btn svelte-1msgwmh");
    			attr_dev(button1, "data-toggle", "tooltip");
    			attr_dev(button1, "data-title", "A script to calculate 1 + 1.");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file, 117, 2, 4494);
    			attr_dev(button2, "class", "btn svelte-1msgwmh");
    			attr_dev(button2, "data-toggle", "tooltip");
    			attr_dev(button2, "data-title", "A function that says hello to given name.");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file, 120, 2, 4642);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button2, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*scripts_helloworld*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*scripts_1plus1*/ ctx[8], false, false, false),
    					listen_dev(button2, "click", /*scripts_namefunction*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(113:2) {#if !execute}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link0;
    	let script0;
    	let script0_src_value;
    	let link1;
    	let t0;
    	let main;
    	let center;
    	let h1;
    	let t2;
    	let p;
    	let t3;
    	let a0;
    	let t5;
    	let a1;
    	let t7;
    	let t8;
    	let span;
    	let t10;
    	let textarea;
    	let br;
    	let t11;
    	let button0;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let div;
    	let t16;
    	let script1;
    	let t18;
    	let script2;
    	let t20;
    	let button1;
    	let i;
    	let mounted;
    	let dispose;
    	let if_block0 = /*execute*/ ctx[2] && create_if_block_1(ctx);
    	let if_block1 = !/*execute*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			script0 = element("script");
    			link1 = element("link");
    			t0 = space();
    			main = element("main");
    			center = element("center");
    			h1 = element("h1");
    			h1.textContent = "PyOnBrowser - Python Interpreter";
    			t2 = space();
    			p = element("p");
    			t3 = text("Made with ❤️ by ");
    			a0 = element("a");
    			a0.textContent = "@akatiggerx04";
    			t5 = text(" on github, Powered by ");
    			a1 = element("a");
    			a1.textContent = "PyScript";
    			t7 = text(".");
    			t8 = space();
    			span = element("span");
    			span.textContent = "beta";
    			t10 = space();
    			textarea = element("textarea");
    			br = element("br");
    			t11 = space();
    			button0 = element("button");
    			t12 = text(/*run_button_text*/ ctx[1]);
    			t13 = space();
    			if (if_block0) if_block0.c();
    			t14 = space();
    			if (if_block1) if_block1.c();
    			t15 = space();
    			div = element("div");
    			t16 = space();
    			script1 = element("script");
    			script1.textContent = "var textarea = document.getElementById(\"code\");\n\t\ttextarea.addEventListener(\"keydown\", function(event) {\n\t\t\tif (event.keyCode === 9) {\n\t\t\t\tevent.preventDefault();\n\t\t\t\n\t\t\t\tvar start = this.selectionStart;\n\t\t\t\tvar end = this.selectionEnd;\n\t\t\t\n\t\t\t\tthis.value = this.value.substring(0, start) + \"\\t\" + this.value.substring(end);\n\t\t\t\n\t\t\t\tthis.selectionStart = this.selectionEnd = start + 1;\n\t\t\t}\n\t\t});";
    			t18 = space();
    			script2 = element("script");
    			script2.textContent = "let urlParams = new URLSearchParams(window.location.search);\n\t\t\tlet is_shared_code = urlParams.has('py');\n\t\t\tvar textarea = document.getElementById(\"code\");\n\t\t\tif (is_shared_code){\n\t\t\t\tvar loaded_code = urlParams.get('py');\n\t\t\t\ttextarea.value = atob(loaded_code);\n\t\t\t}";
    			t20 = space();
    			button1 = element("button");
    			i = element("i");
    			attr_dev(link0, "rel", "stylesheet");
    			attr_dev(link0, "href", "https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/css/halfmoon-variables.min.css");
    			add_location(link0, file, 77, 1, 2134);
    			script0.defer = true;
    			if (!src_url_equal(script0.src, script0_src_value = "https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/js/halfmoon.min.js")) attr_dev(script0, "src", script0_src_value);
    			add_location(script0, file, 78, 1, 2241);
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "href", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css");
    			attr_dev(link1, "integrity", "sha256-eZrrJcwDc/3uDhsdt61sL2oOBY362qM3lon1gyExkL0=");
    			attr_dev(link1, "crossorigin", "anonymous");
    			add_location(link1, file, 79, 1, 2335);
    			attr_dev(h1, "class", "mb-0 font-size-24");
    			add_location(h1, file, 84, 2, 2574);
    			attr_dev(a0, "href", "https://github.com/akatiggerx04");
    			add_location(a0, file, 85, 39, 2681);
    			attr_dev(a1, "href", "https://pyscript.net/");
    			add_location(a1, file, 85, 121, 2763);
    			attr_dev(p, "class", "mt-0 mb-0");
    			add_location(p, file, 85, 2, 2644);
    			attr_dev(span, "class", "badge badge-danger");
    			add_location(span, file, 86, 2, 2815);
    			attr_dev(textarea, "class", "form-control code-area svelte-1msgwmh");
    			attr_dev(textarea, "id", "code");
    			attr_dev(textarea, "placeholder", "Write/Paste your Python code here.");
    			add_location(textarea, file, 87, 2, 2862);
    			add_location(br, file, 87, 165, 3025);
    			attr_dev(button0, "class", "btn btn-primary svelte-1msgwmh");
    			add_location(button0, file, 88, 2, 3032);
    			attr_dev(div, "id", "python");
    			add_location(div, file, 124, 2, 4821);
    			add_location(script1, file, 125, 2, 4847);
    			script2.defer = true;
    			add_location(script2, file, 140, 2, 5269);
    			add_location(center, file, 83, 1, 2563);
    			attr_dev(i, "class", "fa fa-moon-o");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 150, 58, 5637);
    			attr_dev(button1, "class", "toggle-theme btn svelte-1msgwmh");
    			add_location(button1, file, 150, 1, 5580);
    			add_location(main, file, 82, 0, 2555);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document_1.head, link0);
    			append_dev(document_1.head, script0);
    			append_dev(document_1.head, link1);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, center);
    			append_dev(center, h1);
    			append_dev(center, t2);
    			append_dev(center, p);
    			append_dev(p, t3);
    			append_dev(p, a0);
    			append_dev(p, t5);
    			append_dev(p, a1);
    			append_dev(p, t7);
    			append_dev(center, t8);
    			append_dev(center, span);
    			append_dev(center, t10);
    			append_dev(center, textarea);
    			set_input_value(textarea, /*code*/ ctx[0]);
    			append_dev(center, br);
    			append_dev(center, t11);
    			append_dev(center, button0);
    			append_dev(button0, t12);
    			append_dev(center, t13);
    			if (if_block0) if_block0.m(center, null);
    			append_dev(center, t14);
    			if (if_block1) if_block1.m(center, null);
    			append_dev(center, t15);
    			append_dev(center, div);
    			append_dev(center, t16);
    			append_dev(center, script1);
    			append_dev(center, t18);
    			append_dev(center, script2);
    			append_dev(main, t20);
    			append_dev(main, button1);
    			append_dev(button1, i);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[11]),
    					listen_dev(textarea, "change", /*reset_run_button_text*/ ctx[6], false, false, false),
    					listen_dev(button0, "click", /*execute_code*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", toggle_theme, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*code*/ 1) {
    				set_input_value(textarea, /*code*/ ctx[0]);
    			}

    			if (dirty & /*run_button_text*/ 2) set_data_dev(t12, /*run_button_text*/ ctx[1]);

    			if (/*execute*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(center, t14);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!/*execute*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(center, t15);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(script0);
    			detach_dev(link1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function toggle_theme() {
    	halfmoon.toggleDarkMode();
    }

    function highlight_code() {
    	Prism.highlightAll();
    }

    function copy(text) {
    	navigator.clipboard.writeText(text);
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let code = "";
    	let run_button_text = "Run";
    	let original_run_text = run_button_text;
    	let execute = false;
    	let share_url = null;

    	function clear() {
    		$$invalidate(1, run_button_text = original_run_text);
    		$$invalidate(2, execute = false);
    		document.querySelector('pre[class="py-terminal"]').innerHTML = '$ cleared';
    		document.querySelector('pre[class="py-terminal"]').style.display = 'none';
    		var output = document.getElementById("python");
    		output.innerHTML = '';
    	}

    	function execute_code() {
    		if (code == "") {
    			$$invalidate(0, code = document.getElementById("code").value);

    			if (code == "" || code == null) {
    				$$invalidate(1, run_button_text = 'No code to run.');

    				setTimeout(
    					() => {
    						$$invalidate(1, run_button_text = original_run_text);
    					},
    					1000
    				);

    				return;
    			}
    		}

    		$$invalidate(1, run_button_text = 'Executing..');
    		$$invalidate(2, execute = false);

    		setTimeout(
    			() => {
    				$$invalidate(2, execute = true);
    			},
    			10
    		);

    		document.querySelector('pre[class="py-terminal"]').innerHTML = '';
    		document.querySelector('pre[class="py-terminal"]').style.display = 'block';
    		document.querySelector('pre[class="py-terminal"]').style = 'position: relative; bottom: 25px;';
    		var output = document.getElementById("python");
    		output.innerHTML = `<py-script>${code}</py-script>`;

    		setTimeout(
    			() => {
    				$$invalidate(1, run_button_text = 'Rerun');
    				Prism.highlightAll();
    			},
    			1000
    		);
    	}

    	function reset_run_button_text() {
    		$$invalidate(1, run_button_text = original_run_text);
    	}

    	function scripts_helloworld() {
    		$$invalidate(0, code = 'print("Hello world!")');
    		document.getElementById("code").value = code;
    	}

    	function scripts_1plus1() {
    		$$invalidate(0, code = 'x = 1 + 1\nprint(x)');
    		document.getElementById("code").value = code;
    	}

    	function scripts_namefunction() {
    		$$invalidate(0, code = 'def hello(name):\n	print("Hello, " + name + ".")\n\nhello("John")');
    		document.getElementById("code").value = code;
    	}

    	function share_code() {
    		if (code.length > 2000) {
    			return;
    		}

    		var code_base64 = btoa(code);
    		$$invalidate(3, share_url = location.protocol + '//' + location.host + location.pathname + '?py=' + code_base64);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		code = this.value;
    		$$invalidate(0, code);
    	}

    	$$self.$capture_state = () => ({
    		code,
    		run_button_text,
    		original_run_text,
    		execute,
    		share_url,
    		clear,
    		execute_code,
    		reset_run_button_text,
    		toggle_theme,
    		highlight_code,
    		scripts_helloworld,
    		scripts_1plus1,
    		scripts_namefunction,
    		share_code,
    		copy
    	});

    	$$self.$inject_state = $$props => {
    		if ('code' in $$props) $$invalidate(0, code = $$props.code);
    		if ('run_button_text' in $$props) $$invalidate(1, run_button_text = $$props.run_button_text);
    		if ('original_run_text' in $$props) original_run_text = $$props.original_run_text;
    		if ('execute' in $$props) $$invalidate(2, execute = $$props.execute);
    		if ('share_url' in $$props) $$invalidate(3, share_url = $$props.share_url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		code,
    		run_button_text,
    		execute,
    		share_url,
    		clear,
    		execute_code,
    		reset_run_button_text,
    		scripts_helloworld,
    		scripts_1plus1,
    		scripts_namefunction,
    		share_code,
    		textarea_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
