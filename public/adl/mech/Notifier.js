function Notifier()
{
	var style = "width: 71%;height: 14%;position: fixed;background: #454545;opacity: .8;border-radius: 50px;top: 75%;left: 15.5%;box-shadow: 10px 10px 20px,0px 0px 30px grey inset;text-align: center;vertical-align: middle;line-height: 4em;font-size: 4em;font-family: sans-serif;text-shadow: 0px 0px 5px white;color: #1F1F1F;"
	$(document.body).append("<div style='"+style+"' id='NotifierWindow'>This is a test of the multi </div>");
	$(document.body).append("<div id='WaitingWindow'><div style='text-align: center;margin-top: 50px;'><img src='images/loading.gif'><div style='font-size: 1.5em;' id='waittitle' /></div></div>");
	$('#NotifierWindow').hide();
	$('#WaitingWindow').dialog({modal:true,autoOpen:false,resizable:false});
	this.notify = function(text)
	{
	    clearTimeout($('#element').stop().data('timer'));
		$('#NotifierWindow').html(text);
		$('#NotifierWindow').fadeIn(function() {
			var elem = $(this);
			$.data(this, 'timer', setTimeout(function() { elem.fadeOut(); }, 2000));
		  });
	}
	this.startLoad = function()
	{
		this.startWait('Loading...');
	}
	this.startWait = function(title)
	{
		$('#WaitingWindow').dialog('open');
		$('#WaitingWindow').parent().find(".ui-dialog-titlebar").hide();
		$('#WaitingWindow').parent().css('border-radius','20px');
		$('#WaitingWindow').parent().css('width','200px');
		$('#WaitingWindow').parent().css('height','200px');
		$('#WaitingWindow').dialog('option', 'position', 'center');
		$('#waittitle').html(title);
	}
	this.stopWait = function()
	{
		$('#WaitingWindow').dialog('close');
	}
	$(document).bind('BeginParse',this.startLoad.bind(this));
	$(document).bind('EndParse',this.stopWait.bind(this));
}
_Notifier = new Notifier();