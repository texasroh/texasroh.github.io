document.querySelectorAll("*[data-include-path]").forEach((element) => {
	var includePath = element.dataset.includePath;
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200){
			element.outerHTML = this.responseText;
		}
	};
	xhttp.open('GET', includePath, true);
	xhttp.send();
});