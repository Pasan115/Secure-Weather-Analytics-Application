# Secure-Weather-Analytics-Application
This is a Responsive Web Application that retrieves weather data, processes using a custom Comfort Index.

# Comfort Index Formula Explanation

The Comfort Index Score is calculated using a cumulative scoring model that starts from zero and awards points based on how closely weather conditions fall within defined human comfort ranges.

Temperature, humidity, wind speed, and cloudiness were selected as they significantly influence perceived comfort. Each parameter contributes a maximum number of points, resulting in a total possible score of 100.

Cities receive full points when values fall within ideal comfort zones. As conditions deviate from these ranges, points are gradually reduced based on the distance from the comfort zone. This approach avoids over-penalization while providing a realistic representation of comfort levels.

All calculations are performed on the backend to maintain consistency and security. Cities are ranked from most comfortable to least comfortable based on their final Comfort Index scores.
