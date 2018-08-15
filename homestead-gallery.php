<?php
/*
Plugin Name: Homestead Gallery
Description: Simple and Powerful Gallery Plugin
Version: 0.96
Author: Adolfo Anzaldua
Author URI: homesteadheritage.com
License: GPL-2.0+
*/

function load_hg_resources() {
    // Register the script
    wp_register_script( 'homestead-gallery-js', plugins_url( '/res/homestead-gallery-js.js', __FILE__ ), array( 'jquery' ), '11012017' );

    // Enqueuing the script:
    wp_enqueue_script( 'homestead-gallery-js' );

    // Registering the style
    wp_register_style( 'homestead-gallery-css', plugins_url( '/res/homestead-gallery-css.css', __FILE__ ), array(), '11012017', 'all' );

    // Enqueuing the style
    wp_enqueue_style( 'homestead-gallery-css' );

}
add_action( 'wp_enqueue_scripts', 'load_hg_resources' );

function init_hg_shortcodes() {
    function hg_shortcode($atts = [], $content = null) {

        extract(shortcode_atts(array(
        "images" => '1'
        ), $atts));

        echo "<script>
                jQuery(document).ready(function() {
                    jQuery('.HomesteadGallery').HomesteadGallery();
                });
            </script>";

        echo "<div id='main-div' style='z-index: 40; position: relative;'>
                <div id='loader'></div>

                <!-- The Modal -->
                <div id='fullscreen' class='lightbox'></div>

                <!-- The Close Button -->
                <div id='close-div'><span class='close'>&times;</span></div>

                <ul class='HomesteadGallery' style='display: none;' id='gallery'>";

        foreach (explode(",", $images) as $id) {
        	$thumb_src = wp_get_attachment_image_src( $id );
            echo "<li><img src='" . $thumb_src[0] . "' data-large-src='" . wp_get_attachment_url( $id ) . "'></li>";
        }

        echo "</ul>

                <!-- The Snackbar -->
                <div id='snackbar'>Click ESC or the '&times;' to exit Fullscreen Mode</div>
			</div>";

        return $content;
    }
    add_shortcode('homestead-gallery', 'hg_shortcode');
}
add_action('init', 'init_hg_shortcodes');
?>
