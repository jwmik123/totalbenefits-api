//Template for register mail
const subject = `Welkom bij Total Benefits!`;

const html = `
<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>Welkom bij 1608!</title>
</head>
<body style="background-color:#f7f7f7;">
<!-- partial:index.partial.html -->
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
	<meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!-->
	  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<!--<![endif]-->
  <title></title>
	<!--[if mso]>
	<style type="text/css">
    table {border-collapse:collapse;border:0;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
	</style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    @media screen and (max-width: 350px) {
      .three-col .column {
        max-width: 100% !important;
      }
    }
    @media screen and (min-width: 351px) and (max-width: 460px) {
      .three-col .column {
        max-width: 100% !important;
      }
    }
    @media screen and (max-width: 460px) {
      .two-col .column {
        max-width: 50% !important;
      }
      .two-col img {
        width: 100% !important;
      }
    }
    @media screen and (min-width: 461px) {
      .three-col .column {
        max-width: 33.3% !important;
      }
      .two-col .column {
        max-width: 50% !important;
      }
      .sidebar .small {
        max-width: 16% !important;
      }
      .sidebar .large {
        max-width: 84% !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:#ffffff;">
  <div role="article" aria-roledescription="email" lang="en" style="-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#f7f7f7;">
    <table role="presentation" style="width:100%;border:0;border-spacing:0;">
      <tr>
        <td align="center">
          <!--[if mso]>
          <table role="presentation" align="center" style="width:660px;">
          <tr>
          <td style="padding:20px 0;">
          <![endif]-->
          <div class="outer" style="width:96%;max-width:660px;margin:20px auto;">
            
            <table role="presentation" style="width:100%;border:0;border-spacing:0;">
              <tr>
                <td style="padding:10px 10px 20px 10px;text-align:center;">
                  <img src="https://www.vsdv.nl/wp-content/uploads/2021/10/VSDV-logo.png" width="100" alt="Keldr" style="width:100px;height:auto;" />
                </td>
              </tr>
              <tr>
                <td style="padding:25px;text-align:left;background-color:#fff;border-top: 5px solid #00FF87;">
                  <h2 style="color:#0A0A3F;text-align:center;font-family:Arial, Helvetica, sans-serif;">Welkom bij Keldr {first_name}!</h2>
                  <div style="text-align:center;margin-bottom:20px;">
                    <img src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXd6ZHFyNzZuNTVrNmNzdW9kb3psZGNtdDBtNTZ0ZXU4bzRvdml4cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1xmDpBG7JMjm7KLOsW/giphy-downsized-large.gif" style="max-width:200px;" alt="Welkom bij Keldr" />
                  </div>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:16px;line-height:22px;text-align:center;">Onderstaand vind je de eenmalige code om je account te activeren.</p>
                </td>
              </tr>
            </table>
            <p style="color:#A3A3A3;font-family:Arial,sans-serif;font-style:italic;">Deze email is automatisch gegenereerd</p>
          </div>
          <!--[if mso]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
<!-- partial -->
  
</body>
</html>
`;

module.exports = {
  subject,
  html,
};