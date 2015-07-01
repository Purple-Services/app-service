$(document).ready(function($) {
    "use strict";

	// Video control
	document.getElementById("bgVid").defaultPlaybackRate = 0.5;
	document.getElementById("bgVid").playbackRate = 0.5;

    // Fast hack to Init the header black if doc already scrolled
      if ($(document).scrollTop() > 350){
        $("header").css("background", "#000000").css("padding", "0px 0px 13px");
      }else{
        $("header").css("background", "transparent").css("padding", "20px 0px 20px");
      }

    // Anchor Smooth Scroll
    $('body').on('click', '.page-scroll', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1500, 'easeInOutExpo');
        event.preventDefault();
    });

    // Intro Slider
    $('#main-slider').flexslider({
        animation: "fade",
        slideshowSpeed: 3500,
        controlNav: false,
        directionNav: false
    });

    // Testimonial Slider
    var owl = $("#quote-slider");
    owl.owlCarousel({
        navigation: false,
        singleItem: true,
        transitionStyle: "fade",
        autoPlay: 3000
    });

    // Screenshots Slider
    $('.shots-slider').slick({
        dots: true,
        arrows: false,
        speed: 300,
        centerMode: false,
        slidesToShow: 4,
        slidesToScroll: 1,
        responsive: [{
            breakpoint: 1024,
            settings: {
                slidesToShow: 3,
                slidesToScroll: 1,
                infinite: true,
                dots: true
            }
        }, {
            breakpoint: 600,
            settings: {
                slidesToShow: 2,
                slidesToScroll: 1
            }
        }, {
            breakpoint: 480,
            settings: {
                slidesToShow: 1,
                slidesToScroll: 1
            }
        }]
    });

    // Prettyphoto
    $("a[class^='prettyPhoto']").prettyPhoto({
        theme: 'pp_default'
    });

    // Countdown Timer
    var endDate = "August 20, 2015";
        $('.countdown.styled').countdown({
          date: endDate,
          render: function(data) {
            $(this.el).html("<div>" + this.leadingZeros(data.days, 2) + " <span>days</span></div><div>" + this.leadingZeros(data.hours, 2) + " <span>hrs</span></div><div>" + this.leadingZeros(data.min, 2) + " <span>min</span></div><div>" + this.leadingZeros(data.sec, 2) + " <span>sec</span></div>");
          }
    });

});

// Custom Popup
$(".term-popup").on("click", function() {
    $(".terms").addClass("terms-active");
    $(".overlay-dark").addClass("active");
});

$(".t-close").on("click", function() {
    $(".terms").removeClass("terms-active");
    $(".overlay-dark").removeClass("active");
});

// Fixed Header
$(window).scroll(function() {
    var value = $(this).scrollTop();
    if (value > 350)
        $("header").css("background", "#000").css("padding", "0px 0px 13px");
    else
        $("header").css("background", "transparent").css("padding", "20px 0px 20px");
});
