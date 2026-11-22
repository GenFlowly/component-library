# Activity log fixtures

Byte-identical copies of `genai-proxy-service/retrieval-server/tests/fixtures/activity/*.json`, the golden logs the retrieval server's recorder writes from scripted turns. They are the activity contract: the reducer tests and the stories load them, so a backend change that alters the log fails here too. Never edit them by hand; regenerate in the retrieval server and copy them over.
