<script>
	let code = "";
	let run_button_text = "Run";
	let original_run_text = run_button_text;
	let execute = false;
	let share_url = null;
	
	function clear() {
		run_button_text = original_run_text;
		execute = false;
		document.querySelector('pre[class="py-terminal"]').innerHTML = '$ cleared';
		document.querySelector('pre[class="py-terminal"]').style.display = 'none';
		var output = document.getElementById("python");
		output.innerHTML = '';
	}

	function execute_code() {
		if (code == "") {
			code = document.getElementById("code").value;
			if (code == "" || code == null) {
				run_button_text = 'No code to run.';
				setTimeout(() => {run_button_text = original_run_text;}, 1000);
				return;
			}
		}
		run_button_text = 'Executing..';
		execute = false;
		setTimeout(() => {execute = true;}, 10)
		document.querySelector('pre[class="py-terminal"]').innerHTML = '';
		document.querySelector('pre[class="py-terminal"]').style.display = 'block';
		document.querySelector('pre[class="py-terminal"]').style = 'position: relative; bottom: 25px;';
		var output = document.getElementById("python");
		output.innerHTML = `<py-script>${code}</py-script>`;
		setTimeout(() => {run_button_text = 'Rerun'; Prism.highlightAll();}, 1000)
	}

	function reset_run_button_text() {
		run_button_text = original_run_text;
	}

	function toggle_theme() {
		halfmoon.toggleDarkMode();
	}

	function highlight_code() {
		Prism.highlightAll();
	}

	function scripts_helloworld() {
		code = 'print("Hello world!")';
		document.getElementById("code").value = code;
	}

	function scripts_1plus1() {
		code = 'x = 1 + 1\nprint(x)';
		document.getElementById("code").value = code;
	}

	function scripts_namefunction() {
		code = 'def hello(name):\n	print("Hello, " + name + ".")\n\nhello("John")';
		document.getElementById("code").value = code;
	}

	function share_code() {
		if (code.length > 2000) {
			return;
		}
		var code_base64 = btoa(code); 
		share_url = location.protocol + '//' + location.host + location.pathname + '?py=' + code_base64;
	}

	function copy(text) {
		navigator.clipboard.writeText(text);
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/css/halfmoon-variables.min.css">
	<script defer src="https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/js/halfmoon.min.js"></script>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" integrity="sha256-eZrrJcwDc/3uDhsdt61sL2oOBY362qM3lon1gyExkL0=" crossorigin="anonymous" />
</svelte:head>

<main>
	<center>
		<h1 class="mb-0 font-size-24">PyOnBrowser - Python Interpreter</h1>
		<p class="mt-0 mb-0">Made with ❤️ by <a href="https://github.com/akatiggerx04">@akatiggerx04</a> on github, Powered by <a href="https://pyscript.net/">PyScript</a>.</p>
		<span class="badge badge-danger">beta</span>
		<textarea class="form-control code-area" id="code" bind:value={code} placeholder="Write/Paste your Python code here." on:change={reset_run_button_text}></textarea><br>
		<button class="btn btn-primary" on:click={execute_code}>{run_button_text}</button>
		{#if execute}
			<button class="btn" on:click={clear}><i class="fa fa-trash" aria-hidden="true"></i> Clear</button>
			{#if code.length < 2000 }
				<div class="modal" id="share-py" tabindex="-1" role="dialog">
					<div class="modal-dialog" role="document">
					<div class="modal-content">
						<a href="#close" class="close" role="button" aria-label="Close">
						<span aria-hidden="true">&times;</span>
						</a>
						<h5 class="modal-title">Share Your Python Snippet</h5>
						<code class="text-right">{share_url}</code>
						<div class="text-right mt-20">
						<a href="#close" class="btn mr-5" role="button">Close</a>
						<a href="#close" class="btn btn-primary" role="button" on:click={copy(share_url)}>Copy Link</a>
						</div>
					</div>
					</div>
				</div>
				<a href="#share-py" role="button"><button class="btn" on:click={share_code}><i class="fa fa-share-alt" aria-hidden="true"></i> Share</button></a>
			{/if}
			<pre><code class="language-python" id="highlighted-code">{code}</code></pre>
			<script>Prism.highlightAll();</script>
		{/if}
		{#if !execute}
		<p class="mt-0">Code Examples:</p>
		<button class="btn" data-toggle="tooltip" data-title="A simple Hello world Python script." type="button" on:click={scripts_helloworld}>
			Hello world
		</button>
		<button class="btn" data-toggle="tooltip" data-title="A script to calculate 1 + 1." type="button" on:click={scripts_1plus1}>
			1 + 1
		</button>
		<button class="btn" data-toggle="tooltip" data-title="A function that says hello to given name." type="button" on:click={scripts_namefunction}>
			Say Hello
		</button>
		{/if}
		<div id="python"></div>
		<script>
		var textarea = document.getElementById("code");
		textarea.addEventListener("keydown", function(event) {
			if (event.keyCode === 9) {
				event.preventDefault();
			
				var start = this.selectionStart;
				var end = this.selectionEnd;
			
				this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
			
				this.selectionStart = this.selectionEnd = start + 1;
			}
		});
		</script>
		<script defer>
			let urlParams = new URLSearchParams(window.location.search);
			let is_shared_code = urlParams.has('py');
			var textarea = document.getElementById("code");
			if (is_shared_code){
				var loaded_code = urlParams.get('py');
				textarea.value = atob(loaded_code);
			}
		</script>
	</center>
	<button class="toggle-theme btn" on:click={toggle_theme}><i class="fa fa-moon-o" aria-hidden="true"></i></button>
</main>

<style>
	button {
		margin: 5px;
		margin-bottom: 25px;
	}
	.code-area {
		margin-top: 20px;
		width: 80%;
		height: 50vh;
	}
	.toggle-theme {
		position: fixed;
		bottom: 15px;
		right: 10px;
		margin-bottom: 0 !important;
		z-index: 1000;
	}
</style>