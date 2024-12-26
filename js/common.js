(function($) {
    // maintenance-start week
    // Accepts numbers from 0 (Sunday) to 6 (Saturday)
    // UTC
    const maintenance_start_week = 3 // Wednesday
    const maintenance_start_hour = 2 // 02:00
    const maintenance_hours = 6 // 6 hours
    const maintenance_start_hour_digit = parseInt(String(maintenance_start_hour) + '0000') // 020000 (HHmmss)

    dayjs.extend(window.dayjs_plugin_utc)
    dayjs.extend(window.dayjs_plugin_timezone)
    dayjs.extend(window.dayjs_plugin_advancedFormat)

    const ua_type_ps4 = 'PS4'
    const tzshort_type_none = 'tzsh_none'
    const timezone_area_type_none = 'tz_none'
    
    let ua
    if (window.navigator.userAgent.toLocaleLowerCase().match(/playstation 4/) == 'playstation 4') {
        ua = ua_type_ps4
    }

    let timezone_area

    if (ua == ua_type_ps4) {
        timezone_area = timezone_area_type_none; 
    } else {
        try {
          timezone_area = dayjs.tz.guess();
        } catch (e) {
          timezone_area = '';
        }
    }
    
    $(function() {
        setPso2Time();
        setRating();
        submitServicelogin();

    });

    function setPso2Time() {
        $('pso2time').each(function() {
            const $this = $(this);
            if ( $this.data('processed') ) {
                return;
            }

            let dt;
            if ( $this.attr('epoch') ) {
                dt = dayjs(parseInt($this.attr('epoch')));
            }
            else if ( $this.attr('time') ) {
                if ( $this.attr('time').substring(0, 'maintenance'.length) === 'maintenance' ) {
                    const now = dayjs().utc()
                    let next_maintenance_start
                    if ( now.day() === maintenance_start_week ) {
                        if ( parseInt(now.format('HHmmss')) >= maintenance_start_hour_digit ) {
                            next_maintenance_start = now.add(7, 'day')
                        }
                        else {
                            next_maintenance_start = now
                        }
                    }
                    else if ( now.day() < maintenance_start_week ) {
                        next_maintenance_start = now.add(maintenance_start_week - now.day(), 'day')
                    }
                    else {
                        next_maintenance_start = now.add(7 - (now.day() - maintenance_start_week), 'day')
                    }
                    next_maintenance_start = next_maintenance_start.hour(maintenance_start_hour).minute(0).second(0)

                    if ( next_maintenance_start.local().utcOffset() !== now.local().utcOffset() ) {
                        // 次のメンテナンスのタイムゾーンが変わる場合は前回のメンテナンスの時間の表記に
                        next_maintenance_start = next_maintenance_start.subtract(7, 'day')
                    }

                    if ( $this.attr('time') === 'maintenance-start' ) {
                        dt = next_maintenance_start
                    }
                    else if ( $this.attr('time') === 'maintenance-end' ) {
                        dt = next_maintenance_start.add(maintenance_hours, 'h')
                    }
                    else {
                        dt = dayjs().utc().minute(0).second(0)
                    }
                    dt = dt.local()
                }
                else {
                    dt = dayjs($this.attr('time')).utc(true).subtract(9, 'h').local()
                }
            }
            else {
                dt = dayjs();
            }

            let timezone_short
            if(ua === ua_type_ps4) {
                timezone_short = tzshort_type_none;
            } else {
                try {
                    if ( dt.utcOffset() === 9*60 ) {
                        timezone_short = 'JST';
                    }
                    else {
                        timezone_short = dt.format('z');
                    }
                } catch (e) {
                    timezone_short = '';
                }
            }

            let format = $this.attr('format');
            format = format.replace('area', '----------');
            format = format.replace('timezone', '==========');
            let dateteme = ''
            try {
                datetime = dt.format(format);
            } catch (error) {
                datetime = '-';
            }
            datetime = datetime.replace('----------', timezone_area);
            datetime = datetime.replace('==========', timezone_short);
            tzfirst = datetime.indexOf(timezone_area_type_none);
            if(tzfirst > -1) {
                tzend = tzfirst + timezone_area_type_none.length;
                //timezoneの前後にdddがくっついてるか
                if($this.attr('format').indexOf('dddarea') <= -1) {
                    tzfirst=tzfirst-1;
                } 
                if($this.attr('format').indexOf('areaddd') <= -1) {
                    tzend=tzend+1;
                }
                datetime = datetime.replace(datetime.substring(tzfirst,tzend),'');
            }
            tzshfirst = datetime.indexOf(tzshort_type_none);
            if(tzshfirst > -1) {
                tzshend = tzshfirst + tzshort_type_none.length;
                if($this.attr('format').indexOf('dddtimezone') <= -1) {
                    tzshfirst=tzshfirst-1;
                } 
                if($this.attr('format').indexOf('timezoneddd') <= -1) {
                    tzshend=tzshend+1;
                }
                datetime = datetime.replace(datetime.substring(tzshfirst,tzshend),'');
            }
            $this.text(datetime);
            $this.data('processed', true);
        });
        setTimeout(setPso2Time, 1000);
    }

    function setRating() {
        let rating = Cookies.get('pso2-rating');
        if ( !rating ) {
            rating = 'esrb';
        }

        const classname = 'sys-rating-' + rating;

        var el = document.createElement('style');
        const rule_all = '.sys-rating { display: none!important; }';
        const rule_one = '.' + classname + ' { display: inline-block!important; }';
        document.head.appendChild(el);

        const sheet = el.sheet;
        sheet.insertRule(rule_all, sheet.cssRules.length);
        sheet.insertRule(rule_one, sheet.cssRules.length);
    }  
    window.pso2_setRating = setRating;

    function submitServicelogin() {
        const flashMessage = Cookies.get('pso2-ServiceflashMessage');
        
        if ( flashMessage ) {
           if(!$("#sys_platform")[0]) {
             alert(flashMessage);
           } else {
             $("#sys_platform").prepend("<ul class=\"boxAttention\" id=\"survey\">"+flashMessage+"</ul>")
           }
        }
        Cookies.remove('pso2-ServiceflashMessage');
        $("#sys-service-auth-link__epic").on('click',servicePfLogin);
        $("#sys-service-auth-link__steam").on('click',servicePfLogin);
        $("#sys-service-auth-link__xbox").on('click',servicePfLogin);
        $("#sys-service-auth-link__ps4").on('click',servicePfLoginPS4);

    }

    function servicePfLogin() {
      let uri = $(this).attr('id').split("__");
      let req_param = {
          svid : $(this).attr("svid"),
          redirect_uri: location.href,
      }
      let urlparam = new URLSearchParams(req_param).toString();
      location.href = "/auth/service/"+uri[1]+"?"+$(this).attr("data-param")+"&"+urlparam;
   }

   function servicePfLoginPS4() {
      let uri = $(this).attr('id').split("__");
      let data_param = $(this).attr("data-param");
      let req_param = {
          svid : $(this).attr("svid"),
          redirect_uri: location.href,
      }
      let urlparam = new URLSearchParams(req_param).toString();
      // modal-window
      let timeoutid = setTimeout(function() {
          $(".iziModal-iframe").contents().find("form").submit(function() {
             location.href = "/auth/service/"+uri[1]+"?"+data_param+"&"+urlparam;
	  });
      },1000);
   }
    
})(jQuery);
