import sys
import json
from TM1py.Services import TM1Service
from TM1py.Exceptions import TM1pyRestException

# Get the session cookie
base_url = sys.argv[1]
print("Base URL: {}".format(base_url))

# Get the session cookie
session_cookie = sys.argv[2]
print("Session cookie: {}".format(session_cookie))

# Get the input path
input_path = sys.argv[3]
print("Input path: {}".format(input_path))

# Get the output path
output_path = sys.argv[4]
print("Output path: {}".format(output_path))

with open(input_path) as f:
    data = json.load(f)

    try:
        tm1 = TM1Service(base_url=base_url, session_id=session_cookie, ssl=False)
        server_name = tm1.server.get_server_name()
        print("Connection to TM1 established!! your Servername is: {}".format(server_name))

        c = tm1.cubes.get(data["cube"])
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(str(c))

    except TM1pyRestException as e:
        if e.status_code == 401:
            print("401: Unauthorized")
            sys.exit(4)
        print("\nERROR:")
        print("\t" + str(e))
        sys.exit(1)
    except Exception as e:
        print("\nERROR:")
        print("\t" + str(e))
        sys.exit(1)
