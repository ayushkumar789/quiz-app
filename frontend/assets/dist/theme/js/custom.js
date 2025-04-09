$(document).ready(function () {
  var totalQ = $(".swiper-slide").length;
  var currentQ = 1;
  $(".totalNumber").text(totalQ);

  $(".currentNumber").text(currentQ);

  var swiper = new Swiper(".quizSlide", {
    effect: "creative",
    creativeEffect: {
      prev: {
        shadow: true,
        translate: [0, 0, -800],
        rotate: [180, 0, 0],
      },
      next: {
        shadow: true,
        translate: [0, 0, -800],
        rotate: [-180, 0, 0],
      },
    },

    mousewheel: false,
    allowTouchMove: false,
    speed: 1000,
  });

  // Slide to the next on button click
  $(".swiper-slide .radioInput input").click(function () {
    setTimeout(function () {
      if (currentQ != totalQ) {
        currentQ++;
        swiper.slideNext();
        $(".currentNumber").text(currentQ);
      }
    }, 500);
  });

  const weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const d = new Date();
  let day = weekday[d.getDay()];
  $(".day h2").text(day);
});
